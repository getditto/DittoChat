import { Ditto } from '@dittolive/ditto'
import {
    DittoProvider,
    useDitto,
    useOnlinePlaygroundIdentity,
} from '@dittolive/react-ditto'
import DittoChatUI from '@dittolive/ditto-chat-ui'

const userId = "00069559-1252-4c57-bd3f-5ede944358a5"

const ChatTestContent = () => {
    const ditto = useDitto('testing')

    return (
        <div className="flex flex-col h-screen">
            <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                <h1 className="text-xl font-bold text-slate-800 italic">Forge Parent App - Styles Test</h1>
                <div className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                    Parent Tailwind Active
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {ditto?.ditto ? (
                    <DittoChatUI
                        ditto={ditto.ditto as Ditto}
                        theme="light"
                        userId={userId}
                        userCollectionKey="users"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        Initializing Ditto...
                    </div>
                )}
            </div>
        </div>
    )
}

const ChatTest = () => {
    const { create } = useOnlinePlaygroundIdentity()

    return (
        // @ts-expect-error - React 18/19 type mismatch in monorepo
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
                if (loading) return <div className="p-8 text-center text-slate-500">Loading Provider...</div>
                if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>
                return <ChatTestContent />
            }}
        </DittoProvider>
    )
}

export default ChatTest
