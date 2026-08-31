import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConversationProfilePanel } from './conversation-profile-panel'

let root: Root | null = null
let mountedHost: HTMLElement | null = null

async function mountPanel(host: HTMLElement) {
  if (mountedHost === host) return
  const title = document.querySelector('.chat-title')?.textContent?.replace('●', '').trim() || 'Conversation'
  const profileId = await window.unifiedChat?.getActiveProfileId()
  if (!profileId) return
  const inbox = await window.unifiedChat?.loadUnifiedInbox()
  const conversation = inbox?.find((item: any) => item.profileId === profileId && (item.title === title || item.participant?.displayName === title))
  const conversationId = conversation?.id
  if (!conversationId) return

  root?.unmount()
  host.innerHTML = ''
  root = createRoot(host)
  mountedHost = host
  root.render(<ConversationProfilePanel profileId={profileId} conversationId={conversationId} conversationName={title} onClose={() => document.querySelector<HTMLButtonElement>('.chat-actions button')?.click()} />)
}

const observer = new MutationObserver(() => {
  const host = document.querySelector<HTMLElement>('.conversation-profile')
  if (host) void mountPanel(host)
  else if (mountedHost) {
    root?.unmount()
    root = null
    mountedHost = null
  }
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }), { once: true })
} else {
  observer.observe(document.body, { childList: true, subtree: true })
}
