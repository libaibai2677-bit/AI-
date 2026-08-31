import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Provider = 'WhatsApp' | 'Telegram'
type Status = 'connected' | 'attention' | 'disconnected' | 'not-configured'
type View = 'chats' | 'profiles' | 'search' | 'settings'
type Filter = 'All' | 'Unread' | 'Mentions' | 'Favorites' | 'Follow Up'

type Profile = UnifiedChatProfile
type Conversation = { id: string; name: string; profileId: string; profile: string; provider: Provider; preview: string; translated: string; unread: boolean; favorite: boolean; mention: boolean; followUp: boolean; timestamp: string }
type InboxUpdate = { type: 'conversation-updated' | 'conversation-removed'; profileId: string; conversationId: string; conversation?: any }

const fallbackProfiles: Profile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', health: { session: 'connected', network: 'connected', messages: 'connected', translation: 'connected' }, translation: 'DeepL', language: 'Chinese' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', health: { session: 'connected', network: 'connected', messages: 'connected', translation: 'connected' }, translation: 'DeepL', language: 'Chinese' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', health: { session: 'attention', network: 'connected', messages: 'attention', translation: 'connected' }, translation: 'DeepL', language: 'Chinese' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', health: { session: 'connected', network: 'connected', messages: 'connected', translation: 'connected' }, translation: 'Google', language: 'Chinese' },
]

const fallbackConversations: Conversation[] = [
  { id: 'john', name: 'John', profileId: 'personal', profile: 'Personal', provider: 'WhatsApp', preview: 'Are you free tomorrow?', translated: '明天有空吗？', unread: true, favorite: true, mention: false, followUp: true, timestamp: '2026-08-31T08:00:00.000Z' },
  { id: 'client-a', name: 'Client A', profileId: 'work', profile: 'Work', provider: 'WhatsApp', preview: 'Can you send me the file?', translated: '你可以把文件发给我吗？', unread: true, favorite: false, mention: true, followUp: true, timestamp: '2026-08-31T07:30:00.000Z' },
  { id: 'david', name: 'David', profileId: 'telegram', profile: 'Personal', provider: 'Telegram', preview: 'See you later.', translated: '晚点见。', unread: false, favorite: true, mention: false, followUp: false, timestamp: '2026-08-30T12:00:00.000Z' },
]

function toConversation(item: any, profiles: Profile[]): Conversation {
  const profile = profiles.find((candidate) => candidate.id === item.profileId)
  const message = item.lastMessage
  return { id: item.id, name: item.title || item.participant?.displayName || 'Unknown', profileId: item.profileId, profile: profile?.name ?? item.profileId, provider: item.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram', preview: message?.text ?? '', translated: message?.translatedText ?? '', unread: item.unreadCount > 0, favorite: Boolean(item.favorite), mention: item.mentionCount > 0, followUp: Boolean(item.followUp), timestamp: item.updatedAt }
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>(fallbackConversations)
  const [activeId, setActiveId] = useState('personal')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('chats')
  const [filter, setFilter] = useState<Filter>('All')
  const [selectedConversationKey, setSelectedConversationKey] = useState('personal:john')
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [dataSource, setDataSource] = useState<'local' | 'demo'>('demo')

  const refreshInbox = async (nextProfiles: Profile[] = profiles) => {
    const inbox = await window.unifiedChat?.loadUnifiedInbox()
    if (!inbox?.length) return false
    const nextConversations = inbox.map((item: any) => toConversation(item, nextProfiles))
    setConversations(nextConversations)
    setDataSource('local')
    return true
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const storedProfiles = await window.unifiedChat?.listProfiles()
        const nextProfiles = storedProfiles?.length ? storedProfiles : fallbackProfiles
        if (!mounted) return
        setProfiles(nextProfiles)
        const active = (await window.unifiedChat?.getActiveProfileId()) ?? nextProfiles[0]?.id ?? 'personal'
        setActiveId(nextProfiles.some((profile) => profile.id === active) ? active : nextProfiles[0]?.id ?? 'personal')
        const inbox = await window.unifiedChat?.loadUnifiedInbox()
        if (mounted && inbox?.length) {
          const nextConversations = inbox.map((item: any) => toConversation(item, nextProfiles))
          setConversations(nextConversations)
          setDataSource('local')
          const preferredProfile = nextProfiles.find((profile) => profile.id === active)
          const preferred = preferredProfile?.lastConversationId ? nextConversations.find((conversation) => conversation.profileId === preferredProfile.id && conversation.id === preferredProfile.lastConversationId) : undefined
          const first = preferred ?? nextConversations[0]
          if (first) setSelectedConversationKey(`${first.profileId}:${first.id}`)
        }
      } catch { if (mounted) { setProfiles(fallbackProfiles); setDataSource('demo') } }
      finally { if (mounted) setLoadingProfiles(false) }
    }
    void load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const cleanupInbox = window.unifiedChat?.onInboxUpdate((update: InboxUpdate) => {
      if (locked) return
      setConversations((current) => {
        if (update.type === 'conversation-removed') return current.filter((item) => !(item.profileId === update.profileId && item.id === update.conversationId))
        if (!update.conversation) return current
        const next = toConversation(update.conversation, profiles)
        const without = current.filter((item) => !(item.profileId === next.profileId && item.id === next.id))
        return [next, ...without]
      })
      setDataSource('local')
    })
    return () => cleanupInbox?.()
  }, [profiles, locked])

  useEffect(() => {
    const cleanupLock = window.unifiedChat?.onQuickLock(() => setLocked(true))
    return () => cleanupLock?.()
  }, [])

  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? fallbackProfiles[0]
  const selectedConversation = conversations.find((conversation) => `${conversation.profileId}:${conversation.id}` === selectedConversationKey) ?? conversations[0]
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return conversations.filter((conversation) => {
      const matchesFilter = filter === 'All' || (filter === 'Unread' ? conversation.unread : filter === 'Mentions' ? conversation.mention : filter === 'Favorites' ? conversation.favorite : conversation.followUp)
      const matchesProfile = activeId ? conversation.profileId === activeId : true
      const matchesSearch = !query || `${conversation.name} ${conversation.profile} ${conversation.provider} ${conversation.preview} ${conversation.translated}`.toLowerCase().includes(query)
      return matchesFilter && matchesProfile && matchesSearch
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [conversations, filter, search, activeId])

  const selectConversation = (conversation: Conversation) => { setSelectedConversationKey(`${conversation.profileId}:${conversation.id}`); setActiveId(conversation.profileId); setView('chats'); void window.unifiedChat?.setLastConversation(conversation.profileId, conversation.id) }
  const openProfile = async (profile: Profile) => { setActiveId(profile.id); const last = conversations.find((item) => item.profileId === profile.id && item.id === profile.lastConversationId); if (last) setSelectedConversationKey(`${last.profileId}:${last.id}`); setProfileMenuOpen(false); await window.unifiedChat?.openProfile(profile.id); await refreshInbox(profiles) }
  const switchView = (next: View) => { setView(next); if (next !== 'search') setSearch('') }

  if (loadingProfiles) return <main className="vault"><div className="vault-card"><h1>Unified Chat</h1><p>Loading Profiles…</p></div></main>
  if (locked) return <main className="vault"><div className="vault-card"><h1>Unified Chat</h1><p>🔐 Profile Vault</p><button className="primary" onClick={() => setLocked(false)}>Unlock</button></div></main>

  return <main className="app">
    <header className="topbar"><div className="brand-group"><button className="icon-button" aria-label="Menu">☰</button><button className="brand brand-button" onClick={() => switchView('chats')}>Unified Chat</button><label className="search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setView('search') }} placeholder="Search everywhere..." /></label></div><div className="top-actions"><div className="profile-switch-wrap"><button className="profile-switch" onClick={() => setProfileMenuOpen((open) => !open)}><StatusDot status={active.status} /> {active.name} <span className="provider-label">{active.provider}</span> ▾</button>{profileMenuOpen && <div className="profile-menu"><div className="menu-title">Profiles</div>{profiles.map((profile) => <button key={profile.id} className="profile-option" onClick={() => void openProfile(profile)}><StatusDot status={profile.status} /><span>{profile.name}</span><small>{profile.provider}</small></button>)}</div>}</div><button className="icon-button" aria-label="Lock" onClick={() => setLocked(true)}>🔒</button></div></header>
    <section className="workspace"><aside className="sidebar"><div className="section-title">Chats</div><nav className="filters">{(['All', 'Unread', 'Mentions', 'Favorites', 'Follow Up'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); setView('chats') }}>{item}</button>)}</nav><div className="conversation-list">{visibleConversations.map((conversation) => <button key={`${conversation.profileId}:${conversation.id}`} className={selectedConversationKey === `${conversation.profileId}:${conversation.id}` ? 'conversation selected' : 'conversation'} onClick={() => selectConversation(conversation)}><div className="avatar">{conversation.name.slice(0, 1)}</div><div className="conversation-body"><div className="conversation-top"><strong>{conversation.name}</strong>{conversation.unread && <span className="unread-dot" />}</div><div className="conversation-meta">{conversation.provider} · {conversation.profile}</div><div className="preview">{conversation.preview || 'No messages yet.'}</div></div></button>)}</div><button className="profiles-link" onClick={() => switchView('profiles')}>◉ Profiles</button><button className="profiles-link" onClick={() => switchView('settings')}>⚙ Settings</button></aside><section className="chat"><div className="chat-header"><div><div className="chat-title">{selectedConversation?.name ?? 'No conversation'} <span className="online">●</span></div><div className="chat-subtitle">{selectedConversation ? `${selectedConversation.provider} · ${selectedConversation.profile}` : 'Select a conversation'}</div></div></div>{selectedConversation ? <div className="messages"><div className="message-row incoming"><div className="bubble"><div>{selectedConversation.preview}</div>{selectedConversation.translated && <div className="translation">{selectedConversation.translated}</div>}</div></div><div className="composer"><span>📎</span><input placeholder="Type a message..." /><button>🌐</button><button>✨</button><button>➤</button></div></div> : <div className="empty-chat">Select a conversation</div>}</section></section>
  </main>
}

function StatusDot({ status }: { status: Status }) { return <span className={`status ${status}`} aria-label={status} /> }

createRoot(document.getElementById('root')!).render(<App />)
