import '@dittolive/ditto-chat-ui/styles/tailwind.css'
import '@dittolive/ditto-chat-ui/styles/ditto-chat-ui.css'

import { Ditto } from '@dittolive/ditto'
import {
  DittoProvider,
  useDitto,
  useOnlinePlaygroundIdentity,
  usePendingCursorOperation,
} from '@dittolive/react-ditto'
import DittoChatUI from '@dittolive/ditto-chat-ui'
import { useEffect, useState } from 'react'

import ActivitiesDemo from './ActivitiesDemo'
import { useDittoChat } from '@dittolive/ditto-chat-core'

type ViewMode = 'chat' | 'activities'

const StoreInitializer = ({
  ditto,
  userId,
}: {
  ditto: Ditto
  userId: string
}) => {
  useDittoChat({
    ditto,
    userId,
    userCollectionKey: 'users',
  })
  return null
}

const DittoChatUIWrapper = () => {
  const ditto = useDitto('testing')
  const [userId, setUserId] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const { documents: users } = usePendingCursorOperation({
    collection: 'users',
  })

  useEffect(() => {
    console.log({ userId })
  }, [userId])

  if (!userId) {
    return (
      <div>
        <p style={{ textAlign: 'center', fontSize: '24px', margin: '1rem' }}>
          Login User
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center',
            minWidth: '100%',
          }}
        >
          {users.map((user) => (
            <button
              key={user.value._id}
              style={{
                background: '#ff4d00',
                color: '#fff',
                width: '200px',
                height: '50px',
                padding: '10px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setUserId(user.value._id)}
            >
              {user.value.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toggle Button */}
      <div
        style={{
          padding: '8px 16px',
          background: '#f0f0f0',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setViewMode('chat')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'chat' ? '#ff4d00' : '#ccc',
            color: viewMode === 'chat' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Chat UI
        </button>
        <button
          onClick={() => setViewMode('activities')}
          style={{
            padding: '6px 12px',
            background: viewMode === 'activities' ? '#ff4d00' : '#ccc',
            color: viewMode === 'activities' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Activities Demo
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {viewMode === 'chat' && (
          <DittoChatUI
            ditto={ditto?.ditto as Ditto}
            theme="auto"
            userId={userId}
            userCollectionKey="users"
          />
        )}
        {viewMode === 'activities' && (
          <>
            <StoreInitializer ditto={ditto?.ditto as Ditto} userId={userId} />
            <ActivitiesDemo />
          </>
        )}
      </div>
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
    >
      {({ loading, error }) => {
        if (loading) return <p>Loading</p>
        if (error) return <p>{error.message}</p>
        return <DittoChatUIWrapper />
      }}
    </DittoProvider>
  )
}

export default App
