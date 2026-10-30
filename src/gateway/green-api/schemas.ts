import { z } from 'zod'

const chatType = z.enum(['user', 'group', 'channel', 'bot']).catch('user')
const optionalString = z.string().optional().catch(undefined)
const phoneNumber = z.union([z.number(), z.string()]).optional().catch(undefined)

export const instanceStateSchema = z
  .enum(['authorized', 'notAuthorized', 'blocked', 'starting', 'suspended', 'pendingPassword'])
  .catch('notAuthorized')

export const accountSettingsSchema = z.object({
  stateInstance: instanceStateSchema,
  phone: z.coerce.string().catch(''),
  chatId: z.coerce.string().catch(''),
  avatar: optionalString,
})

export const instanceSettingsSchema = z.object({
  webhookUrl: z.string().catch(''),
  incomingWebhook: z.string().catch('no'),
  outgoingWebhook: z.string().catch('no'),
  outgoingMessageWebhook: z.string().catch('no'),
  outgoingAPIMessageWebhook: z.string().catch('no'),
  stateWebhook: z.string().catch('no'),
})

export type InstanceSettings = z.infer<typeof instanceSettingsSchema>

export const checkAccountSchema = z.object({
  exist: z.boolean(),
  chatId: z.coerce.string().catch(''),
})

export const sendMessageSchema = z.object({
  idMessage: z.coerce.string(),
})

export const contactInfoSchema = z.object({
  chatId: z.coerce.string(),
  chatType,
  name: z.string().catch(''),
  contactName: z.string().catch(''),
  avatar: optionalString,
  phoneNumber,
  lastSeen: z.number().nullish().catch(null),
})

export const chatListSchema = z.array(
  z.object({
    chatId: z.coerce.string(),
    name: z.string().catch(''),
    type: chatType,
    phoneNumber,
    unreadCount: z.number().catch(0),
  }),
)

export const historyItemSchema = z.object({
  type: z.enum(['incoming', 'outgoing']),
  idMessage: z.coerce.string(),
  timestamp: z.number(),
  typeMessage: z.string(),
  chatId: z.coerce.string(),
  statusMessage: optionalString,
  textMessage: optionalString,
  caption: optionalString,
  fileName: optionalString,
  senderName: optionalString,
  senderContactName: optionalString,
})

export const historySchema = z.array(z.unknown())

export const receiveNotificationSchema = z
  .object({
    receiptId: z.number(),
    body: z.unknown(),
  })
  .nullable()

export const deleteNotificationSchema = z.object({
  result: z.boolean(),
})

export const readChatSchema = z.object({ setRead: z.boolean() }).partial()

const senderDataSchema = z.object({
  chatId: z.coerce.string(),
  chatName: optionalString,
  chatType,
  sender: optionalString,
  senderName: optionalString,
  senderContactName: optionalString,
  senderPhoneNumber: phoneNumber,
})

const messageDataSchema = z.looseObject({
  typeMessage: z.string(),
  textMessageData: z.object({ textMessage: z.string() }).optional().catch(undefined),
  extendedTextMessageData: z.object({ text: z.string() }).optional().catch(undefined),
  fileMessageData: z
    .object({ caption: optionalString, fileName: optionalString })
    .optional()
    .catch(undefined),
})

export const messageNotificationSchema = z.object({
  typeWebhook: z.enum([
    'incomingMessageReceived',
    'outgoingMessageReceived',
    'outgoingAPIMessageReceived',
  ]),
  timestamp: z.number(),
  idMessage: z.coerce.string(),
  senderData: senderDataSchema,
  messageData: messageDataSchema,
})

export const statusNotificationSchema = z.object({
  typeWebhook: z.literal('outgoingMessageStatus'),
  chatId: z.coerce.string(),
  idMessage: z.coerce.string(),
  status: z.enum(['sent', 'delivered', 'read', 'failed', 'noAccount', 'notInGroup']),
  description: optionalString,
})

export const stateNotificationSchema = z.object({
  typeWebhook: z.literal('stateInstanceChanged'),
  stateInstance: instanceStateSchema,
})

export const quotaNotificationSchema = z.object({
  typeWebhook: z.literal('quotaExceeded'),
  quotaData: z.object({ description: z.string().catch('') }).catch({ description: '' }),
})

export type MessageNotification = z.infer<typeof messageNotificationSchema>
export type HistoryItem = z.infer<typeof historyItemSchema>

export const ackSchema = z.looseObject({}).nullable()

export type ContactInfoResponse = z.infer<typeof contactInfoSchema>
export type ChatListResponse = z.infer<typeof chatListSchema>
