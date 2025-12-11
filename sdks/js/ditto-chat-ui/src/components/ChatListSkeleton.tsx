import React from 'react'

function SkeletonListItem() {
  return (
    <div className="px-4 py-3 flex items-center space-x-4">
      <div className="w-10 h-10 rounded-full bg-(--secondary-bg-hover)"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-(--secondary-bg-hover)"></div>
        <div className="h-3 w-1/2 rounded bg-(--secondary-bg-hover)"></div>
      </div>
    </div>
  )
}

function ChatListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-(--surface-color) animate-pulse">
      <header className="p-4 border-b border-(--border-color) flex justify-between items-center">
        <div className="h-8 w-1/3 rounded bg-(--secondary-bg-hover)"></div>
        <div className="w-9 h-9 rounded-full bg-(--secondary-bg-hover)"></div>
      </header>
      <div className="p-4 space-y-4">
        <div className="h-12 w-full rounded-lg bg-(--secondary-bg-hover)"></div>
        <div className="h-10 w-full rounded-lg bg-(--secondary-bg-hover)"></div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </div>
  )
}

export default ChatListSkeleton
