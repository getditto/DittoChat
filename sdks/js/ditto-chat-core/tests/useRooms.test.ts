import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockDitto, createTestStore, MockDitto } from './setup'
import { QueryResult } from '@dittolive/ditto'
import Room from '../src/types/Room'
import ChatUser from '../src/types/ChatUser'

describe('useRooms Slice', () => {
  let store: ReturnType<typeof createTestStore>
  let mockDitto: MockDitto

  beforeEach(() => {
    mockDitto = createMockDitto()
    store = createTestStore(mockDitto)
  })

  describe('Initialization', () => {
    it('initializes subscriptions for rooms', () => {
      expect(mockDitto.sync.registerSubscription).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * from rooms'),
      )
    })

    it('initializes subscriptions for DM rooms', () => {
      expect(mockDitto.sync.registerSubscription).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT * from dm_rooms where (array_contains(participants, :userId))',
        ),
        { userId: 'test-user-id' },
      )
    })

    it('initializes observers for rooms and DM rooms', () => {
      expect(mockDitto.store.registerObserver).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * from rooms'),
        expect.any(Function),
      )

      expect(mockDitto.store.registerObserver).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * from dm_rooms'),
        expect.any(Function),
        { userId: 'test-user-id' },
      )
    })

    it('does not initialize subscriptions when ditto is null', () => {
      const mockDittoForTest = createMockDitto()
      mockDittoForTest.sync.registerSubscription.mockClear()
      mockDittoForTest.store.registerObserver.mockClear()

      createTestStore(null)

      expect(mockDittoForTest.sync.registerSubscription).not.toHaveBeenCalled()
      expect(mockDittoForTest.store.registerObserver).not.toHaveBeenCalled()
    })
  })

  describe('createRoom', () => {
    it('executes correct INSERT query', async () => {
      const roomName = 'General'
      await store.getState().createRoom(roomName)

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `rooms` DOCUMENTS (:newDoc)'),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            name: roomName,
            createdBy: 'test-user-id',
            collectionId: 'rooms',
            messagesId: 'messages',
            isGenerated: false,
          }),
        }),
      )
    })

    it('creates room with retention days', async () => {
      const roomName = 'Temporary Room'
      const retentionDays = 7

      await store.getState().createRoom(roomName, retentionDays)

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `rooms`'),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            name: roomName,
            retentionDays: 7,
          }),
        }),
      )
    })

    it('uses currentUser._id when available', async () => {
      store.setState({
        currentUser: {
          _id: 'current-user-123',
          name: 'Current User',
          subscriptions: {},
          mentions: {},
        },
      })

      await store.getState().createRoom('Test Room')

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            createdBy: 'current-user-123',
          }),
        }),
      )
    })

    it('returns the created room', async () => {
      const result = await store.getState().createRoom('New Room')

      expect(result).toEqual(
        expect.objectContaining({
          name: 'New Room',
          collectionId: 'rooms',
          messagesId: 'messages',
        }),
      )
    })

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDitto.store.execute.mockRejectedValueOnce(new Error('DB Error'))

      const result = await store.getState().createRoom('Error Room')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating rooms:',
        expect.any(Error),
      )
      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('returns early when ditto is null', async () => {
      const storeWithoutDitto = createTestStore(null)

      const result = await storeWithoutDitto.getState().createRoom('Test Room')

      expect(result).toBeUndefined()
      expect(mockDitto.store.execute).not.toHaveBeenCalled()
    })

    it('should not create room when canCreateRoom permission is false', async () => {
      const state = store.getState()

      state.updateRBACConfig({ canCreateRoom: false })
      expect(state.canPerformAction('canCreateRoom')).toBe(false)

      vi.clearAllMocks()

      const result = await state.createRoom('Test Room')

      expect(result).toBeUndefined()
      expect(mockDitto.store.execute).not.toHaveBeenCalled()
    })

    it('should create room when canCreateRoom permission is true (default)', async () => {
      const state = store.getState()

      expect(state.canPerformAction('canCreateRoom')).toBe(true)

      await state.createRoom('Test Room')

      expect(mockDitto.store.execute).toHaveBeenCalled()
    })
  })

  describe('createDMRoom', () => {
    beforeEach(() => {
      store.setState({
        currentUser: {
          _id: 'test-user-id',
          name: 'Bob',
          subscriptions: {},
          mentions: {},
        },
      })
    })

    it('executes correct INSERT query with participants', async () => {
      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      await store.getState().createDMRoom(targetUser)

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO `dm_rooms`'),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            collectionId: 'dm_rooms',
            messagesId: 'dm_messages',
            participants: ['test-user-id', 'other-user'],
            name: 'Bob & Alice',
          }),
        }),
      )
    })

    it('returns the created DM room', async () => {
      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      const result = await store.getState().createDMRoom(targetUser)

      expect(result).toEqual(
        expect.objectContaining({
          collectionId: 'dm_rooms',
          participants: ['test-user-id', 'other-user'],
        }),
      )
    })

    it('throws error when currentUser is missing', () => {
      store.setState({ currentUser: null })

      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      expect(() => store.getState().createDMRoom(targetUser)).toThrow(
        'Invalid users',
      )
    })

    it('throws error when currentUser._id is missing', () => {
      store.setState({
        currentUser: {
          _id: '',
          name: 'Bob',
          subscriptions: {},
          mentions: {},
        } as ChatUser,
      })

      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      expect(() => store.getState().createDMRoom(targetUser)).toThrow(
        'Invalid users',
      )
    })

    it('throws error when target user._id is missing', () => {
      const targetUser = {
        _id: '',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      } as ChatUser

      expect(() => store.getState().createDMRoom(targetUser)).toThrow(
        'Invalid users',
      )
    })

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDitto.store.execute.mockRejectedValueOnce(new Error('DB Error'))

      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      const result = await store.getState().createDMRoom(targetUser)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating dm_rooms:',
        expect.any(Error),
      )
      expect(result).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('returns early when ditto is null', async () => {
      const storeWithoutDitto = createTestStore(null)
      storeWithoutDitto.setState({
        currentUser: {
          _id: 'test-user-id',
          name: 'Bob',
          subscriptions: {},
          mentions: {},
        },
      })

      const targetUser = {
        _id: 'other-user',
        name: 'Alice',
        subscriptions: {},
        mentions: {},
      }

      const result = await storeWithoutDitto.getState().createDMRoom(targetUser)

      expect(result).toBeUndefined()
      expect(mockDitto.store.execute).not.toHaveBeenCalled()
    })
  })

  describe('Observer callbacks', () => {
    describe('Rooms observer', () => {
      it('updates local state when Ditto observer receives new rooms', () => {
        let observerCallback!: (result: Partial<QueryResult<Room>>) => void

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (
            query.toLowerCase().includes('from rooms') &&
            !query.includes('dm_rooms')
          ) {
            observerCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)

        expect(observerCallback).toBeDefined()

        const newRoom = {
          _id: 'new-room',
          name: 'Observer Room',
          collectionId: 'rooms',
          messagesId: 'messages',
          createdBy: 'user-1',
          createdOn: '2023-01-01',
          isGenerated: false,
        }

        observerCallback({
          items: [{ value: newRoom }],
        } as Partial<QueryResult<Room>>)

        expect(store.getState().rooms).toHaveLength(1)
        expect(store.getState().rooms[0].name).toBe('Observer Room')
        expect(store.getState().roomsLoading).toBe(false)
      })

      it('handles multiple rooms in observer callback', () => {
        let observerCallback!: (result: Partial<QueryResult<Room>>) => void

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (
            query.toLowerCase().includes('from rooms') &&
            !query.includes('dm_rooms')
          ) {
            observerCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)

        const rooms = [
          {
            _id: 'room-1',
            name: 'Room 1',
            collectionId: 'rooms',
            messagesId: 'messages',
            createdBy: 'user-1',
            createdOn: '2023-01-01',
            isGenerated: false,
          },
          {
            _id: 'room-2',
            name: 'Room 2',
            collectionId: 'rooms',
            messagesId: 'messages',
            createdBy: 'user-2',
            createdOn: '2023-01-02',
            isGenerated: false,
          },
        ]

        observerCallback({
          items: rooms.map((value) => ({ value })),
        } as Partial<QueryResult<Room>>)

        expect(store.getState().rooms).toHaveLength(2)
        expect(store.getState().rooms[0].name).toBe('Room 1')
        expect(store.getState().rooms[1].name).toBe('Room 2')
      })

      it('handles empty observer result', () => {
        let observerCallback!: (result: Partial<QueryResult<Room>>) => void

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (
            query.toLowerCase().includes('from rooms') &&
            !query.includes('dm_rooms')
          ) {
            observerCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)

        observerCallback({ items: [] } as Partial<QueryResult<Room>>)

        expect(store.getState().rooms).toHaveLength(0)
      })

      it('calls messagesPublisher for each room', () => {
        let observerCallback!: (result: Partial<QueryResult<Room>>) => void
        const messagesPublisherSpy = vi.fn()

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (
            query.toLowerCase().includes('from rooms') &&
            !query.includes('dm_rooms')
          ) {
            observerCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)
        store.setState({ messagesPublisher: messagesPublisherSpy })

        const newRoom = {
          _id: 'new-room',
          name: 'Test Room',
          collectionId: 'rooms',
          messagesId: 'messages',
          createdBy: 'user-1',
          createdOn: '2023-01-01',
          isGenerated: false,
        }

        observerCallback({
          items: [{ value: newRoom }],
        } as Partial<QueryResult<Room>>)

        expect(messagesPublisherSpy).toHaveBeenCalledWith(newRoom)
      })

      it('filters and replaces rooms by collectionId', () => {
        let observerCallback!: (result: Partial<QueryResult<Room>>) => void

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (
            query.toLowerCase().includes('from rooms') &&
            !query.includes('dm_rooms')
          ) {
            observerCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)

        // Add initial DM room
        store.setState({
          rooms: [
            {
              _id: 'dm-room-1',
              name: 'DM Room',
              collectionId: 'dm_rooms',
              messagesId: 'dm_messages',
              createdBy: 'user-1',
              createdOn: '2023-01-01',
              isGenerated: false,
              participants: ['user-1', 'user-2'],
            },
          ],
        })

        // Now add regular rooms
        const regularRoom = {
          _id: 'regular-room-1',
          name: 'Regular Room',
          collectionId: 'rooms',
          messagesId: 'messages',
          createdBy: 'user-1',
          createdOn: '2023-01-02',
          isGenerated: false,
        }

        observerCallback({
          items: [{ value: regularRoom }],
        } as Partial<QueryResult<Room>>)

        // Should have both DM room and regular room
        expect(store.getState().rooms).toHaveLength(2)
        expect(
          store.getState().rooms.find((r) => r.collectionId === 'dm_rooms'),
        ).toBeDefined()
        expect(
          store.getState().rooms.find((r) => r.collectionId === 'rooms'),
        ).toBeDefined()
      })
    })

    describe('DM rooms observer', () => {
      it('updates local state when DM rooms observer receives new rooms', () => {
        let dmObserverCallback!: (result: Partial<QueryResult<Room>>) => void

        mockDitto.store.registerObserver = vi.fn((query, cb) => {
          if (query.includes('dm_rooms')) {
            dmObserverCallback = cb
          }
          return { stop: vi.fn() }
        })

        store = createTestStore(mockDitto)

        expect(dmObserverCallback).toBeDefined()

        const newDMRoom = {
          _id: 'dm-room-1',
          name: 'Alice & Bob',
          collectionId: 'dm_rooms',
          messagesId: 'dm_messages',
          createdBy: 'user-1',
          createdOn: '2023-01-01',
          isGenerated: false,
          participants: ['user-1', 'user-2'],
        }

        dmObserverCallback({
          items: [{ value: newDMRoom }],
        } as Partial<QueryResult<Room>>)

        expect(store.getState().rooms).toHaveLength(1)
        expect(store.getState().rooms[0].collectionId).toBe('dm_rooms')
        expect(store.getState().rooms[0].participants).toEqual([
          'user-1',
          'user-2',
        ])
      })
    })
  })
})
