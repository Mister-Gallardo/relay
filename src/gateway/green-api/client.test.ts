import { describe, expect, it, vi } from 'vitest'
import { GreenApiClient, defaultApiUrl } from './client'
import { GreenApiError } from './errors'

const credentials = {
  apiUrl: 'https://3100.api.green-api.com/',
  idInstance: '3100000001',
  apiTokenInstance: 'a'.repeat(50),
}

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(
    async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  )
}

describe('GreenApiClient', () => {
  it('собирает адрес метода и отправляет JSON', async () => {
    const fetchMock = respond(200, { idMessage: '42' })
    const client = new GreenApiClient(credentials, fetchMock)

    await expect(client.sendMessage('10000000', 'Привет')).resolves.toEqual({ idMessage: '42' })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe(
      `https://3100.api.green-api.com/waInstance3100000001/sendMessage/${'a'.repeat(50)}`,
    )
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ chatId: '10000000', message: 'Привет' }))
  })

  it('передаёт receiptId в путь DeleteNotification', async () => {
    const fetchMock = respond(200, { result: true })
    await new GreenApiClient(credentials, fetchMock).deleteNotification(1234567)
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/deleteNotification\/a+\/1234567$/)
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('DELETE')
  })

  it('пустой ответ ReceiveNotification превращает в null', async () => {
    const client = new GreenApiClient(credentials, respond(200, 'null'))
    await expect(client.receiveNotification(5)).resolves.toBeNull()
  })

  it.each([
    [401, '', 'unauthorized'],
    [403, '', 'forbidden'],
    [429, '', 'rate_limited'],
    [466, '{"message":"quota"}', 'quota_exceeded'],
    [400, '{"message":"instance is starting or not authorized"}', 'instance_not_ready'],
    [400, 'Message cannot be received because custom webhook url is set', 'webhook_url_set'],
    [502, 'Bad Gateway', 'server'],
  ])('HTTP %i → %s', async (status, body, code) => {
    const client = new GreenApiClient(credentials, respond(status, body))
    await expect(client.getAccountSettings()).rejects.toMatchObject({ code })
  })

  it('сетевую ошибку отдаёт как network', async () => {
    const client = new GreenApiClient(
      credentials,
      vi.fn<typeof fetch>(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const error = await client.getAccountSettings().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error).toMatchObject({ code: 'network', retryable: true })
  })

  it('ответ не по схеме считает ошибкой', async () => {
    const client = new GreenApiClient(credentials, respond(200, { unexpected: true }))
    await expect(client.sendMessage('1', 'x')).rejects.toMatchObject({ code: 'bad_response' })
  })
})

describe('defaultApiUrl', () => {
  it('берёт хост по первым четырём цифрам инстанса', () => {
    expect(defaultApiUrl('3100123456')).toBe('https://3100.api.green-api.com')
    expect(defaultApiUrl('')).toBe('https://api.green-api.com')
  })
})
