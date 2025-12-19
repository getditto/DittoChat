import './index.css'
import { Ditto } from '@dittolive/ditto'
import {
  DittoProvider,
  useDitto,
  useOnlinePlaygroundIdentity,
  usePendingCursorOperation,
} from '@dittolive/react-ditto'
import DittoChatUI from '@dittolive/ditto-chat-ui'
import { useEffect, useState } from 'react'
import type { Theme } from '../../../sdks/js/ditto-chat-ui/dist/types'

const myTheme: Theme = {
  variant: 'dark',

  // Primary Palette
  primaryColor: '#6366f1', // Indigo 500
  primaryColorHover: '#4f46e5', // Indigo 600
  primaryColorFocus: '#4338ca', // Indigo 700
  primaryColorLight: '#7782a4ff', // Indigo 100
  primaryColorLighter: '#eef2ff', // Indigo 50
  primaryColorLightBorder: '#c7d2fe', // Indigo 200
  primaryColorDarkText: '#312e81', // Indigo 900
  textOnPrimary: '#ffffff',

  // Mentions
  mentionText: '#6366f1',
  mentionTextOnPrimary: '#c7d2fe',

  // Surface & Backgrounds
  surfaceColor: '#111827', // Gray 900
  surfaceColorLight: '#1f2937', // Gray 800
  secondaryBg: '#374151', // Gray 700
  secondaryBgHover: '#4b5563', // Gray 600
  disabledBg: '#374151', // Gray 700

  // Text Colors
  textColor: '#ffffffff', // Gray 50
  textColorMedium: '#e5e7eb', // Gray 200
  textColorLight: '#d1d5db', // Gray 300
  textColorLighter: '#9ca3af', // Gray 400
  textColorLightest: '#6b7280', // Gray 500
  textColorFaint: '#4b5563', // Gray 600
  textColorDisabled: '#374151', // Gray 700

  // Borders
  borderColor: '#374151', // Gray 700

  // Status & Actions
  editBg: '#1e3a8a', // Blue 900
  editText: '#bfdbfe', // Blue 200
  infoIconColor: '#3b82f6', // Blue 500
  notificationBadgeBg: '#ef4444', // Red 500
  activeStatusBg: '#22c55e', // Green 500
  dangerText: '#f87171', // Red 400
  dangerBg: '#7f1d1d', // Red 900
  successBg: '#14532d', // Green 900
  successText: '#86efac', // Green 300
}

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
            theme={myTheme}
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
