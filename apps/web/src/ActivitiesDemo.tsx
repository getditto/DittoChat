import { useDittoChatStore, chatStore } from '@dittolive/ditto-chat-core'
import type { ChatStore } from '@dittolive/ditto-chat-core'
import { useState } from 'react'
import { ChatView } from '@dittolive/ditto-chat-ui'
import type { Chat } from '@dittolive/ditto-chat-ui'

interface Activity {
  id: string
  title: string
  description: string
  commentRoomId: string
}

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'activity-1',
    title: '🚀 Product Launch',
    description: 'Launch the new mobile app features',
    commentRoomId: 'comments-activity-1',
  },
  {
    id: 'activity-2',
    title: '👥 Team Meeting',
    description: 'Weekly sync-up and planning session',
    commentRoomId: 'comments-activity-2',
  },
  {
    id: 'activity-3',
    title: '🔍 Code Review',
    description: 'Review PR #123 - Authentication refactor',
    commentRoomId: 'comments-activity-3',
  },
  {
    id: 'activity-4',
    title: '📝 Documentation',
    description: 'Update API documentation for v2.0',
    commentRoomId: 'comments-activity-4',
  },
  {
    id: 'activity-5',
    title: '🎯 Sprint Planning',
    description: 'Plan tasks for the upcoming sprint',
    commentRoomId: 'comments-activity-5',
  },
]

export default function ActivitiesDemo() {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  )

  // Check if store is initialized
  if (!chatStore) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <h2 style={{ color: '#ff4d00' }}>⚠️ Store Not Initialized</h2>
        <p>
          Please click on <strong>"Chat UI"</strong> tab first to initialize the
          chat store,
        </p>
        <p>
          then switch back to <strong>"Activities Demo"</strong>.
        </p>
      </div>
    )
  }

  // Access store method to create generated rooms
  const createGeneratedRoom = useDittoChatStore(
    (state: ChatStore) => state.createGeneratedRoom,
  )

  // Initialize comment rooms (create them if they don't exist)
  const handleActivityClick = async (activity: Activity) => {
    // Create the comment room if it doesn't exist yet
    await createGeneratedRoom(
      activity.commentRoomId,
      `Comments: ${activity.title}`,
    )

    setSelectedActivity(activity)
  }

  const handleBack = () => {
    setSelectedActivity(null)
  }

  if (selectedActivity) {
    // Create a minimal Chat object for ChatView
    const chat: Chat = {
      id: selectedActivity.commentRoomId,
      name: `Comments: ${selectedActivity.title}`,
      type: 'group',
      participants: [],
      messages: [],
    }

    return (
      // Wrap in web-chat-root and theme class to apply correct styles
      <div className="web-chat-root" style={{ height: '100%' }}>
        <div className="light h-full">
          <div className="flex flex-col h-full bg-(--surface-color) font-sans text-(--text-color)">
            <ChatView
              chat={chat}
              onBack={handleBack}
              roomId={selectedActivity.commentRoomId}
              messagesId="messages"
            />
          </div>
        </div>
      </div>
    )
  }

  // Activities list view
  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2
        style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}
      >
        Activities
      </h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Each activity has its own comment room. Click to view and add comments.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {MOCK_ACTIVITIES.map((activity) => (
          <div
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            style={{
              padding: '20px',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff4d00'
              e.currentTarget.style.boxShadow =
                '0 4px 12px rgba(255, 77, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              {activity.title}
            </h3>
            <p style={{ color: '#666', margin: 0 }}>{activity.description}</p>
            <div
              style={{ marginTop: '12px', fontSize: '14px', color: '#ff4d00' }}
            >
              💬 View comments →
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '40px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        <strong>How it works:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>Each activity has a generated room (comment room)</li>
          <li>Messages are subscribed when you view an activity</li>
          <li>When you go back, the subscription is cleaned up</li>
          <li>This scales well with hundreds of activities</li>
        </ul>
      </div>
    </div>
  )
}
