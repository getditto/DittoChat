/* eslint-disable react-refresh/only-export-components */
import DittoChatUI from './DittoChatUI'

export type {
  BrowserNotificationOptions,
  NotificationPermission,
  UseBrowserNotificationsReturn,
} from './hooks/useBrowserNotifications'
export { useBrowserNotifications } from './hooks/useBrowserNotifications'

export { default as ChatView } from './components/ChatView'
export type { Chat } from './types'

export default DittoChatUI
