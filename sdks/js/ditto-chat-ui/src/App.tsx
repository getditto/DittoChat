import './styles/tailwind.css'
import './styles/ditto-chat-ui.css'

import { Authenticator, Ditto, DittoConfig } from '@dittolive/ditto'
import { DittoProvider, useDitto } from '@dittolive/react-ditto'
import { toast } from 'sonner'

import DittoChatUI from './DittoChatUI'

const PERSISTENCE_PATH = 'dittochat'
const DITTO_DATABASE_ID = String(import.meta.env.VITE_APP_DITTO_DATABASE_ID)
const DITTO_SERVER_URL = String(import.meta.env.VITE_APP_DITTO_SERVER_URL)
const DITTO_PLAYGROUND_TOKEN = String(import.meta.env.VITE_APP_DITTO_APP_TOKEN)

const DittoChatUIWrapper = () => {
  const ditto = useDitto(PERSISTENCE_PATH)
  return (
    <div style={{ height: '100vh' }}>
      <DittoChatUI
        theme="light"
        ditto={ditto?.ditto as Ditto}
        userId="6903511900bd187500bb5c12"
        userCollectionKey="users"
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
  return (
    <DittoProvider
      setup={async () => {
        const ditto = await Ditto.open(
          new DittoConfig(
            DITTO_DATABASE_ID,
            { mode: 'server', url: DITTO_SERVER_URL },
            PERSISTENCE_PATH,
          ),
        )
        await ditto.auth.setExpirationHandler(async (ditto) => {
          try {
            const { error } = await ditto.auth.login(
              DITTO_PLAYGROUND_TOKEN,
              Authenticator.DEVELOPMENT_PROVIDER,
            )
            if (error) {
              console.error('Ditto authentication failed:', error)
            }
          } catch (error) {
            console.error('Ditto authentication failed:', error)
          }
        })
        ditto.sync.start()
        return ditto
      }}
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
