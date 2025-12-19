
import {
  type ChatUser,
  type DittoConfParams,
  type Message,
  type Room,
  useDittoChat,
  useDittoChatStore,
} from '@dittolive/ditto-chat-core'
import { useEffect, useMemo, useState } from 'react'
import { toast, Toaster } from 'sonner'

import ChatList from './components/ChatList'
import ChatListSkeleton from './components/ChatListSkeleton'
import ChatView from './components/ChatView'
import { Icons } from './components/Icons'
import NewMessageModal from './components/NewMessageModal'
import NewRoomModal from './components/NewRoomModal'
import type { Chat } from './types'

const getSystemTheme = () => {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

export default function DittoChatUI({
  ditto,
  userCollectionKey,
  userId,
  theme = 'light',
  rbacConfig,
  notificationHandler,
}: DittoConfParams & { theme: 'light' | 'dark' | 'auto' }) {
  useDittoChat({
    ditto,
    userCollectionKey,
    userId,
    rbacConfig,
    notificationHandler: notificationHandler
      ? notificationHandler
      : (title, description) => {
        toast.info(title, {
          description,
        })
      },
  })

  const [chats, setChats] = useState<Chat[]>([])
  const createDMRoom = useDittoChatStore((state) => state.createDMRoom)
  const createRoom = useDittoChatStore((state) => state.createRoom)
  const rooms: Room[] = useDittoChatStore((state) => state.rooms)
  const users: ChatUser[] = useDittoChatStore((state) => state.allUsers)
  const [themeName, setThemeName] = useState(
    theme === 'auto' ? getSystemTheme() : theme,
  )
  const currentUser: ChatUser | null = useDittoChatStore(
    (state) => state.currentUser,
  )

  const loading = useDittoChatStore(
    (state) =>
      state.roomsLoading || state.usersLoading || state.messagesLoading,
  )

  const [activeScreen, setActiveScreen] = useState<
    'list' | 'chat' | 'newMessage' | 'newRoom'
  >('list')

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [newlyCreatedRoom, setNewlyCreatedRoom] = useState<string | undefined>(
    undefined,
  )

  const messagesByRoom = useDittoChatStore((state) => state.messagesByRoom)

  const latestMessages = useMemo(() => {
    const roomKeys = Object.keys(messagesByRoom)
    const latestMessages: Message[] = roomKeys
      .map((key) => {
        const messages = messagesByRoom[key]
        if (!messages || messages.length === 0) {
          return null
        }
        return messages[messages.length - 1].message
      })
      .filter((msg): msg is Message => msg !== null)
    const sortedMessages = latestMessages.sort(
      (a, b) =>
        new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
    )
    return sortedMessages
  }, [messagesByRoom])

  const isDM = (room: Room) => {
    return room.participants?.length === 2
  }

  useEffect(() => {
    if (!rooms.length || !users.length) {
      return
    }
    const userMap = new Map(users.map((u) => [u._id, u]))
    const messageMap = new Map<string, Message>()
    for (const msg of latestMessages) {
      messageMap.set(msg.roomId, msg)
    }
    const messageRoomIds: string[] = []
    // Rooms that have latest messages (keep order of latestMessages)
    const chatsWithMessages: Chat[] = latestMessages
      .map((message: Message) => {
        const room = rooms.find((r) => r._id === message.roomId)
        if (!room) {
          return null
        }
        messageRoomIds.push(message.roomId)

        const participants: ChatUser[] = (room.participants || [])
          .map((userId) => userMap.get(userId))
          .filter(Boolean) as ChatUser[]

        return {
          id: room._id,
          type: isDM(room) ? 'dm' : 'group',
          name: room.name,
          participants,
          messages: [message],
        }
      })
      .filter(Boolean) as Chat[]

    // Remaining rooms (no messages)
    const emptyRooms = rooms.filter((r) => !messageRoomIds.includes(r._id))

    const chatsWithoutMessages: Chat[] = emptyRooms.map((room) => {
      const participants: ChatUser[] = (room.participants || [])
        .map((userId) => userMap.get(userId))
        .filter(Boolean) as ChatUser[]

      return {
        id: room._id,
        type: isDM(room) ? 'dm' : 'group',
        name: room.name,
        participants,
        messages: [],
      }
    })

    // Combine (latest first)
    setChats([...chatsWithMessages, ...chatsWithoutMessages])
  }, [rooms, latestMessages, users])

  // EFFECT 1: This effect sets up the listener for OS theme changes.
  useEffect(() => {
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setThemeName(newTheme)
    }

    if (theme === 'auto') {
      mediaQueryList.addEventListener('change', handleChange)
    } else {
      mediaQueryList.removeEventListener('change', handleChange)
    }
    // This is the cleanup function that will be called when the component unmounts
    return () => {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  }, [theme])

  useEffect(() => {
    localStorage.setItem('ditto-web-chat-theme', themeName)
    return () => {
      localStorage.removeItem('ditto-web-chat-theme')
    }
  }, [themeName])

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    setActiveScreen('chat')
  }

  const handleNewMessage = (messageType: 'newMessage' | 'newRoom') => {
    setSelectedChat(null)
    setActiveScreen(messageType)
  }

  const handleBack = () => {
    setSelectedChat(null)
    setActiveScreen('list')
  }

  // Update activeRoomId in store when selectedChat changes
  const setActiveRoomId = useDittoChatStore((state) => state.setActiveRoomId)
  useEffect(() => {
    setActiveRoomId(selectedChat?.id || null)
  }, [selectedChat, setActiveRoomId])

  const handleNewDMCreate = async (user: ChatUser) => {
    const isExists = chats.find((chat) => {
      if (chat.participants.length !== 2) {
        return false
      }
      const ids = chat.participants.map((p) => p._id)
      return ids.includes(user._id) && ids.includes(currentUser?._id)
    })

    if (isExists) {
      handleSelectChat(isExists)
      return
    }

    const createdRoom = await createDMRoom(user)
    setNewlyCreatedRoom(createdRoom?._id)
  }

  const handleNewRoomCreate = async (roomName: string) => {
    const createdRoom = await createRoom(roomName)
    setNewlyCreatedRoom(createdRoom?._id)
  }

  useEffect(() => {
    if (!newlyCreatedRoom) {
      return
    }
    const chat = chats.find((chat) => chat.id === newlyCreatedRoom)
    if (chat) {
      handleSelectChat(chat)
      setNewlyCreatedRoom(undefined)
    }
  }, [chats, newlyCreatedRoom])

  function updateVisibleHeight(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const visibleHeight = Math.max(0, viewportHeight - rect.top);

    el.style.setProperty("--visible-chat-container-vh", `${visibleHeight}px`);
  }

  // On desktop, default to selecting the first chat
  useEffect(
    () => {
      if (window.innerWidth >= 768 && !selectedChat) {
        setActiveScreen('chat')
      }
      updateVisibleHeight(document.querySelector('.dcui-root') as HTMLElement)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )


  return (
    <div className="dcui-root web-height">
      <div className={themeName}>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 3000,
          }}
        />
        <div className="flex max-h-full web-height bg-(--dc-surface-color) font-sans text-(--dc-text-color) overflow-hidden">
          {/* Chat List */}
          <aside
            className={`w-full md:w-[420px] md:flex-shrink-0 border-r border-(--dc-border-color) flex flex-col ${activeScreen !== 'list' && 'hidden'
              } md:flex`}
          >
            {loading ? (
              <ChatListSkeleton />
            ) : (
              <ChatList
                chats={chats}
                onSelectChat={handleSelectChat}
                onNewMessage={handleNewMessage}
                selectedChatId={selectedChat?.id || ''}
              />
            )}
          </aside>

          {/* Main Content Area */}
          <main
            className={`w-full flex-1 flex-col ${activeScreen === 'list' && 'hidden'
              } md:flex`}
          >
            {activeScreen === 'chat' && selectedChat && (
              <ChatView
                key={selectedChat.id}
                chat={selectedChat}
                onBack={handleBack}
              />
            )}
            {activeScreen === 'newMessage' && (
              <NewMessageModal
                onClose={handleBack}
                onNewDMCreate={handleNewDMCreate}
              />
            )}
            {activeScreen === 'newRoom' && (
              <NewRoomModal
                onClose={handleBack}
                onCreateRoom={handleNewRoomCreate}
              />
            )}
            {!selectedChat &&
              (activeScreen === 'list' || activeScreen === 'chat') && (
                <div className="hidden md:flex flex-col items-center justify-center h-full bg-(--dc-surface-color-light) text-(--dc-text-color-lightest)">
                  <Icons.messageCircle className="w-24 h-24 text-(--dc-text-color-disabled) mb-4" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">or start a new message</p>
                </div>
              )}
          </main>
        </div>
      </div>
    </div>
  )
}
