import { type z } from 'zod'
import { GreenApiError, errorFromResponse } from './errors'
import {
  type InstanceSettings,
  accountSettingsSchema,
  ackSchema,
  chatListSchema,
  checkAccountSchema,
  contactInfoSchema,
  deleteNotificationSchema,
  historySchema,
  instanceSettingsSchema,
  readChatSchema,
  receiveNotificationSchema,
  sendMessageSchema,
} from './schemas'

export interface GreenApiCredentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

type HttpMethod = 'GET' | 'POST' | 'DELETE'

interface CallOptions<T> {
  schema: z.ZodType<T>
  method?: HttpMethod
  body?: unknown
  query?: Record<string, string | number>
  suffix?: string
  signal?: AbortSignal
  timeoutMs?: number
}

const DEFAULT_TIMEOUT = 15_000

export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.replace(/\D/g, '').slice(0, 4)
  return prefix.length === 4 ? `https://${prefix}.api.green-api.com` : 'https://api.green-api.com'
}

function linkSignals(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forward = () => controller.abort(external?.reason)
  if (external?.aborted) forward()
  else external?.addEventListener('abort', forward, { once: true })

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut
    },
    dispose() {
      clearTimeout(timer)
      external?.removeEventListener('abort', forward)
    },
  }
}

export class GreenApiClient {
  private readonly base: string
  private readonly token: string
  private readonly fetchImpl: typeof fetch

  constructor(credentials: GreenApiCredentials, fetchImpl: typeof fetch = fetch.bind(globalThis)) {
    const apiUrl = credentials.apiUrl.trim().replace(/\/+$/, '')
    this.base = `${apiUrl}/waInstance${credentials.idInstance.trim()}`
    this.token = encodeURIComponent(credentials.apiTokenInstance.trim())
    this.fetchImpl = fetchImpl
  }

  async call<T>(apiMethod: string, options: CallOptions<T>): Promise<T> {
    const {
      schema,
      method = 'GET',
      body,
      query,
      suffix,
      signal,
      timeoutMs = DEFAULT_TIMEOUT,
    } = options
    const url = new URL(`${this.base}/${apiMethod}/${this.token}${suffix ? `/${suffix}` : ''}`)
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value))

    const link = linkSignals(signal, timeoutMs)
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method,
        signal: link.signal,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error
      if (link.timedOut) throw new GreenApiError('timeout')
      throw new GreenApiError('network', null, error instanceof Error ? error.message : undefined)
    } finally {
      link.dispose()
    }

    const text = await response.text()
    if (!response.ok) throw errorFromResponse(response.status, text)

    let json: unknown = null
    if (text.trim()) {
      try {
        json = JSON.parse(text)
      } catch {
        throw new GreenApiError('bad_response', response.status, text.slice(0, 200))
      }
    }

    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      throw new GreenApiError('bad_response', response.status, parsed.error.issues[0]?.message)
    }
    return parsed.data
  }

  getAccountSettings(signal?: AbortSignal) {
    return this.call('getAccountSettings', { schema: accountSettingsSchema, signal })
  }

  getSettings(signal?: AbortSignal) {
    return this.call('getSettings', { schema: instanceSettingsSchema, signal })
  }

  setSettings(settings: Partial<InstanceSettings>) {
    return this.call('setSettings', {
      method: 'POST',
      body: settings,
      schema: ackSchema,
    })
  }

  getChats(count: number, signal?: AbortSignal) {
    return this.call('getChats', { schema: chatListSchema, query: { count }, signal })
  }

  checkAccount(phoneNumber: number) {
    return this.call('checkAccount', {
      method: 'POST',
      body: { phoneNumber },
      schema: checkAccountSchema,
    })
  }

  getContactInfo(chatId: string, signal?: AbortSignal) {
    return this.call('getContactInfo', {
      method: 'POST',
      body: { chatId },
      schema: contactInfoSchema,
      signal,
    })
  }

  getChatHistory(chatId: string, count: number, signal?: AbortSignal) {
    return this.call('getChatHistory', {
      method: 'POST',
      body: { chatId, count },
      schema: historySchema,
      signal,
      timeoutMs: 30_000,
    })
  }

  sendMessage(chatId: string, message: string) {
    return this.call('sendMessage', {
      method: 'POST',
      body: { chatId, message },
      schema: sendMessageSchema,
    })
  }

  sendTyping(chatId: string, typingTime: number) {
    return this.call('sendTyping', {
      method: 'POST',
      body: { chatId, typingTime },
      schema: ackSchema,
    })
  }

  readChat(chatId: string) {
    return this.call('readChat', { method: 'POST', body: { chatId }, schema: readChatSchema })
  }

  receiveNotification(receiveTimeout: number, signal?: AbortSignal) {
    return this.call('receiveNotification', {
      schema: receiveNotificationSchema,
      query: { receiveTimeout },
      signal,
      timeoutMs: (receiveTimeout + 10) * 1000,
    })
  }

  deleteNotification(receiptId: number, signal?: AbortSignal) {
    return this.call('deleteNotification', {
      method: 'DELETE',
      suffix: String(receiptId),
      schema: deleteNotificationSchema,
      signal,
    })
  }
}
