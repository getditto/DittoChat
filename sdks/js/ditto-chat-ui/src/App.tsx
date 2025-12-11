import { Ditto } from '@dittolive/ditto'
import {
  DittoProvider,
  useDitto,
  useOnlinePlaygroundIdentity,
} from '@dittolive/react-ditto'
import DittoChatUI from './DittoChatUI'
import { toast } from 'sonner'

const DittoChatUIWrapper = () => {
  const ditto = useDitto('testing')
  return (
    <div>
      <DittoChatUI
        // @ts-expect-error - theme prop not yet implemented in DittoChatUI component
        theme="light"
        ditto={ditto?.ditto as Ditto}
        // userId="690342270008f55100255f92" // update actual user id
        userId="6903511900bd187500bb5c12" // update actual user id
        userCollectionKey="users"
        rbacConfig={{
          canMentionUsers: true,
          canSubscribeToRoom: true,
          canCreateRoom: true,
        }}
        notificationHandler={(title, description) => {
          toast.info(title, {
            description,
          })
        }}
      />
    </div>
  )
}

function App() {
  const { create } = useOnlinePlaygroundIdentity()
  return (
    <DittoProvider
      setup={async () => {
        const ditto = new Ditto(
          create({
            appID: String(import.meta.env.VITE_APP_DITTO_APP_ID),
            token: String(import.meta.env.VITE_APP_DITTO_APP_TOKEN),
            enableDittoCloudSync: false,
            customAuthURL: String(import.meta.env.VITE_APP_DITTO_AUTH_URL),
          }),
          'testing',
        )
        ditto.updateTransportConfig((config) => {
          config.connect.websocketURLs.push(
            String(import.meta.env.VITE_APP_DITTO_WEB_SOCKET),
          )
        })
        await ditto.store.execute('ALTER SYSTEM SET DQL_STRICT_MODE = false')
        await ditto.disableSyncWithV3()
        ditto.startSync()
        return ditto
      }}
      /* initOptions={initOptions} */
    >
      {({ loading, error }) => {
        if (loading) {
          return <p>Loading</p>
        }
        if (error) {
          return <p>{error.message}</p>
        }
        return <DittoChatUIWrapper />
      }}
    </DittoProvider>
  )
}

export default App
