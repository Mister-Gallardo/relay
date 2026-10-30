export const queryKeys = {
  root: (scope: string) => ['relay', scope] as const,
  account: (scope: string) => ['relay', scope, 'account'] as const,
  receiveSettings: (scope: string) => ['relay', scope, 'receive-settings'] as const,
  chats: (scope: string) => ['relay', scope, 'chats'] as const,
  history: (scope: string, chatId: string, count: number) =>
    ['relay', scope, 'history', chatId, count] as const,
  contact: (scope: string, chatId: string) => ['relay', scope, 'contact', chatId] as const,
}
