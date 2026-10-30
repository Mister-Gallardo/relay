import type { ChatType } from '@/entities/chat/model'
import type { RemoteMessage } from '../types'

export interface DemoContact {
  id: string
  type: ChatType
  name: string
  phone?: string
  lastSeenMinutesAgo?: number
  replies: string[]
  members?: string[]
  echo?: boolean
}

export const DEMO_ACCOUNT = {
  phone: '79990001122',
  chatId: '20000000',
}

export const DEMO_CONTACTS: DemoContact[] = [
  {
    id: '10000001',
    type: 'user',
    name: 'Алина Воронцова',
    phone: '79161234567',
    lastSeenMinutesAgo: 0,
    replies: [
      'Спасибо! Сейчас поправлю',
      'Ага, поняла 👌',
      'Давай обсудим голосом через 10 минут?',
    ],
  },
  {
    id: '-60000000000001',
    type: 'group',
    name: 'Команда Relay',
    members: ['Дмитрий', 'Ксения'],
    replies: ['+1', 'Записал в задачи', 'Звучит хорошо'],
  },
  {
    id: '10000002',
    type: 'bot',
    name: 'Доставка «Север»',
    replies: ['Я бот уведомлений и не умею отвечать. Вопросы по заказу — в поддержку.'],
  },
  {
    id: '10000003',
    type: 'user',
    name: 'Максим Ершов',
    phone: '79035550142',
    lastSeenMinutesAgo: 42,
    replies: ['Ок', 'Принял', 'Сейчас гляну'],
  },
  {
    id: '10000004',
    type: 'bot',
    name: 'Эхо-бот',
    replies: [],
    echo: true,
  },
  {
    id: '10000005',
    type: 'user',
    name: 'Ирина Лебедева',
    phone: '375291234567',
    lastSeenMinutesAgo: 60 * 26,
    replies: ['Хорошо, договорились', 'Поняла, спасибо!'],
  },
  {
    id: '10000006',
    type: 'user',
    name: 'Сергей Платонов',
    phone: '79217770011',
    lastSeenMinutesAgo: 60 * 24 * 5,
    replies: ['👍', 'Отлично!'],
  },
]

const MINUTE = 60_000

function minutesAgo(now: number, minutes: number): number {
  return now - minutes * MINUTE
}

function at(now: number, daysBack: number, time: string): number {
  const [h, m] = time.split(':').map(Number)
  const date = new Date(now)
  date.setDate(date.getDate() - daysBack)
  date.setHours(h ?? 0, m ?? 0, 0, 0)
  return Math.min(date.getTime(), now - MINUTE)
}

type Seed = Omit<RemoteMessage, 'id' | 'chatId' | 'kind'> & { kind?: RemoteMessage['kind'] }

function thread(chatId: string, seeds: Seed[]): RemoteMessage[] {
  return seeds.map((seed, index) => ({
    kind: 'text',
    ...seed,
    id: `seed-${chatId}-${index}`,
    chatId,
  }))
}

export function createDemoHistory(now = Date.now()): Record<string, RemoteMessage[]> {
  const inbound = (text: string, timestamp: number, senderName?: string): Seed => ({
    direction: 'in',
    text,
    timestamp,
    senderName,
  })
  const outbound = (
    text: string,
    timestamp: number,
    status: RemoteMessage['status'] = 'read',
  ): Seed => ({
    direction: 'out',
    text,
    timestamp,
    status,
  })

  return {
    '10000001': thread('10000001', [
      inbound('Привет! Скинула макеты нового онбординга в фигму', at(now, 1, '18:40')),
      outbound('Супер, вечером посмотрю', at(now, 1, '18:52')),
      outbound(
        'Посмотрел. Шаг с выбором темы классный, но экран с разрешениями я бы убрал из первого запуска',
        minutesAgo(now, 95),
      ),
      inbound(
        'Согласна, его можно показать позже — когда человек впервые включит уведомления',
        minutesAgo(now, 92),
      ),
      inbound('Тогда переделаю флоу и пришлю к обеду', minutesAgo(now, 91)),
      inbound('Глянь, пожалуйста, обновлённую версию 🙌', minutesAgo(now, 6)),
      inbound('Там ещё вариант с тёмной иконкой', minutesAgo(now, 5)),
    ]),
    '-60000000000001': thread('-60000000000001', [
      inbound('Релиз 1.4 собран, прогнал e2e — всё зелёное', minutesAgo(now, 180), 'Дмитрий'),
      inbound('Проверила на iOS 17: отправка и статусы работают', minutesAgo(now, 150), 'Ксения'),
      outbound('Отлично, тогда выкатываем в 18:00', minutesAgo(now, 140)),
      inbound('Ок, напишу в канал с релизами', minutesAgo(now, 128), 'Дмитрий'),
    ]),
    '10000002': thread('10000002', [
      inbound('Заказ №48213 оплачен. Доставка сегодня с 14:00 до 16:00', at(now, 0, '09:02')),
      inbound('Курьер Артём уже в пути — будет примерно через 40 минут', minutesAgo(now, 24)),
    ]),
    '10000003': thread('10000003', [
      inbound('Во сколько завтра созвон?', at(now, 1, '21:14')),
      outbound('Давай в 11:30, скину ссылку', at(now, 1, '21:20')),
      inbound('Договорились 👍', at(now, 1, '21:21')),
    ]),
    '10000004': thread('10000004', [
      inbound(
        'Повторяю всё, что вы пишете. Удобно, чтобы проверить отправку и статусы',
        at(now, 2, '12:00'),
      ),
    ]),
    '10000005': thread('10000005', [
      outbound('Ирина, добрый день! Отправил договор на почту', at(now, 3, '11:05'), 'delivered'),
      inbound('Получила, спасибо. Подпишем до пятницы', at(now, 3, '15:47')),
    ]),
    '10000006': thread('10000006', [
      inbound('Спасибо за помощь с переездом!', at(now, 8, '20:10')),
      outbound('Всегда пожалуйста 🙂', at(now, 8, '20:31')),
    ]),
  }
}

export const DEMO_UNREAD: Record<string, number> = {
  '10000001': 2,
  '10000002': 1,
}
