/* eslint-disable react-refresh/only-export-components */
import '../styles/tailwind.css'
import '../styles/ditto-chat-ui.css'
import DittoChatUI from './DittoChatUI'

export type {
  BrowserNotificationOptions,
  NotificationPermission,
  UseBrowserNotificationsReturn,
} from './hooks/useBrowserNotifications'
export { useBrowserNotifications } from './hooks/useBrowserNotifications'

export default DittoChatUI
