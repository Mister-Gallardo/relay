export type GreenApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'instance_not_ready'
  | 'instance_expired'
  | 'webhook_url_set'
  | 'validation'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'suspended'
  | 'server'
  | 'network'
  | 'timeout'
  | 'bad_response'

const MESSAGES: Record<GreenApiErrorCode, string> = {
  unauthorized: 'Неверный idInstance или apiTokenInstance',
  forbidden: 'Доступ запрещён — проверьте idInstance и адрес API',
  instance_not_ready: 'Инстанс не авторизован в MAX или ещё запускается',
  instance_expired: 'Срок действия инстанса истёк — продлите его в личном кабинете',
  webhook_url_set: 'В настройках инстанса указан webhookUrl — получение через HTTP API недоступно',
  validation: 'Сервер отклонил запрос',
  rate_limited: 'Слишком много запросов, повторите через секунду',
  quota_exceeded: 'Превышен лимит тарифа MAX Developer',
  suspended: 'На аккаунте временные ограничения на отправку',
  server: 'Сервер GREEN-API недоступен, попробуйте позже',
  network: 'Нет соединения с сервером',
  timeout: 'Сервер не ответил вовремя',
  bad_response: 'Неожиданный ответ сервера',
}

export class GreenApiError extends Error {
  readonly code: GreenApiErrorCode
  readonly status: number | null
  readonly details?: string

  constructor(code: GreenApiErrorCode, status: number | null = null, details?: string) {
    super(MESSAGES[code])
    this.name = 'GreenApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  get retryable(): boolean {
    return ['rate_limited', 'server', 'network', 'timeout', 'instance_not_ready'].includes(
      this.code,
    )
  }
}

export function isGreenApiError(error: unknown): error is GreenApiError {
  return error instanceof GreenApiError
}

export function errorFromResponse(status: number, body: string): GreenApiError {
  const details = extractMessage(body)
  const text = details.toLowerCase()

  if (status === 401) return new GreenApiError('unauthorized', status, details)
  if (status === 403) {
    if (text.includes('suspended')) return new GreenApiError('suspended', status, details)
    return new GreenApiError('forbidden', status, details)
  }
  if (status === 429) return new GreenApiError('rate_limited', status, details)
  if (status === 466) return new GreenApiError('quota_exceeded', status, details)
  if (status >= 500) return new GreenApiError('server', status, details)

  if (text.includes('webhook url is set'))
    return new GreenApiError('webhook_url_set', status, details)
  if (text.includes('expired')) return new GreenApiError('instance_expired', status, details)
  if (text.includes('not authorized') || text.includes('starting process')) {
    return new GreenApiError('instance_not_ready', status, details)
  }
  return new GreenApiError('validation', status, details)
}

function extractMessage(body: string): string {
  if (!body) return ''
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      return String((parsed as { message: unknown }).message)
    }
  } catch {
    return body.slice(0, 300)
  }
  return body.slice(0, 300)
}

export function describeError(error: unknown): string {
  if (isGreenApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Что-то пошло не так'
}
