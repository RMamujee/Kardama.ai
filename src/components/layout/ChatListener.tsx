'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/useChatStore'

type CleanerRef = { id: string; name: string }
type MsgRow = { id: string; cleaner_id: string; sender_role: string; content: string; created_at: string }
type InitialNotification = { cleanerId: string; cleanerName: string; message: string; time: string }

export function ChatListener({ cleaners, initialNotifications }: {
  cleaners: CleanerRef[]
  initialNotifications: InitialNotification[]
}) {
  // Seed store with unread messages from the DB (previous sessions)
  useEffect(() => {
    if (initialNotifications.length === 0) return
    const { addNotification, notifications } = useChatStore.getState()
    const existingIds = new Set(notifications.map(n => n.cleanerId + n.time))
    // oldest first so newest lands at top after each prepend
    for (const n of initialNotifications) {
      if (!existingIds.has(n.cleanerId + n.time)) addNotification(n)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel('global-cleaner-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new as MsgRow
        if (m.sender_role !== 'cleaner') return

        // Skip if the owner is actively viewing this conversation
        const { selectedCleanerId, incrementUnread, addNotification } = useChatStore.getState()
        if (m.cleaner_id === selectedCleanerId) return

        const cleaner = cleaners.find(c => c.id === m.cleaner_id)
        if (!cleaner) return

        incrementUnread(m.cleaner_id)
        addNotification({ cleanerId: m.cleaner_id, cleanerName: cleaner.name, message: m.content, time: m.created_at })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
