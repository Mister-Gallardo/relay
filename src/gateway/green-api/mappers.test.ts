import { describe, expect, it } from 'vitest'
import { mapHistoryItem, mapNotification } from './mappers'

const instanceData = { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' }

const senderData = {
  chatId: '10000000',
  chatName: 'Ходабрыш Пробешёлов',
  chatType: 'user',
  sender: '10000000',
  senderName: 'Ходабрыш Пробешёлов',
  senderType: 'user',
  senderContactName: 'Ходабрыш',
  senderPhoneNumber: 79876543210,
}

describe('mapNotification', () => {
  it('разбирает входящее текстовое сообщение', () => {
    const event = mapNotification({
      typeWebhook: 'incomingMessageReceived',
      instanceData,
      timestamp: 1763115112,
      idMessage: '1763115112345',
      senderData,
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
    })

    expect(event).toEqual({
      type: 'message',
      chat: { id: '10000000', type: 'user', title: 'Ходабрыш Пробешёлов', phone: '79876543210' },
      message: {
        id: '1763115112345',
        chatId: '10000000',
        direction: 'in',
        kind: 'text',
        text: 'Привет',
        timestamp: 1763115112000,
        status: undefined,
        senderName: 'Ходабрыш',
      },
    })
  })

  it('берёт текст из extendedTextMessageData и quotedMessage', () => {
    const extended = mapNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: '1',
      senderData,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://green-api.com' },
      },
    })
    const quoted = mapNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: '2',
      senderData,
      messageData: {
        typeMessage: 'quotedMessage',
        extendedTextMessageData: { text: 'Цитируем это', stanzaId: '1' },
      },
    })

    expect(extended?.type === 'message' && extended.message.text).toBe('https://green-api.com')
    expect(quoted?.type === 'message' && quoted.message.text).toBe('Цитируем это')
  })

  it('исходящее через API помечает как отправленное и не тянет номер отправителя', () => {
    const event = mapNotification({
      typeWebhook: 'outgoingAPIMessageReceived',
      timestamp: 1,
      idMessage: 'out-1',
      senderData,
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ок' } },
    })
    expect(event).toMatchObject({
      type: 'message',
      chat: { id: '10000000', phone: undefined },
      message: { direction: 'out', status: 'sent', senderName: undefined },
    })
  })

  it('для файлов отдаёт подпись-заглушку', () => {
    const event = mapNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: 'img',
      senderData,
      messageData: { typeMessage: 'imageMessage', fileMessageData: { caption: 'Макет' } },
    })
    expect(event).toMatchObject({ message: { kind: 'placeholder', text: 'Фото · Макет' } })
  })

  it('игнорирует реакции и неизвестные типы', () => {
    expect(
      mapNotification({
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1,
        idMessage: 'r',
        senderData,
        messageData: { typeMessage: 'reactionMessage' },
      }),
    ).toBeNull()
    expect(mapNotification({ typeWebhook: 'incomingCall' })).toBeNull()
    expect(mapNotification(null)).toBeNull()
  })

  it('разбирает статус отправленного сообщения', () => {
    expect(
      mapNotification({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '10000000',
        instanceData,
        timestamp: 1755591519,
        idMessage: '115054445839974415',
        status: 'read',
      }),
    ).toEqual({
      type: 'status',
      chatId: '10000000',
      messageId: '115054445839974415',
      status: 'read',
      description: undefined,
    })
  })

  it('разбирает смену состояния инстанса и превышение квоты', () => {
    expect(
      mapNotification({
        typeWebhook: 'stateInstanceChanged',
        instanceData,
        stateInstance: 'notAuthorized',
      }),
    ).toEqual({ type: 'instance-state', state: 'notAuthorized' })

    expect(
      mapNotification({
        typeWebhook: 'quotaExceeded',
        quotaData: {
          method: 'correspondents',
          used: 3,
          total: 3,
          description: 'Monthly quota has been exceeded',
        },
      }),
    ).toEqual({ type: 'quota-exceeded', description: 'Monthly quota has been exceeded' })
  })
})

describe('mapHistoryItem', () => {
  it('переводит секунды в миллисекунды и сохраняет статус исходящего', () => {
    expect(
      mapHistoryItem({
        type: 'outgoing',
        idMessage: 'h1',
        timestamp: 1700000000,
        typeMessage: 'textMessage',
        chatId: '10000000',
        statusMessage: 'delivered',
        textMessage: 'Привет',
        sendByApi: true,
      }),
    ).toMatchObject({ id: 'h1', direction: 'out', timestamp: 1700000000000, status: 'delivered' })
  })

  it('возвращает null для некорректной записи', () => {
    expect(mapHistoryItem({ foo: 'bar' })).toBeNull()
  })
})
