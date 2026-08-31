import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Provider = 'WhatsApp' | 'Telegram'
type Status = 'connected' | 'attention' | 'disconnected' | 'not-configured'
type View = 'chats' | 'profiles' | 'search' | 'settings'
type Filter = 'All' | 'Unread' | 'Mentions' | 'Favorites' | 'Follow Up'

type Profile = UnifiedChatProfile

type Conversation = {
  id: string
  name: string
  profileId: string
  profile: string
  provider: Provider
  preview: string
  translated: string
  unread: boolean
  favorite: boolean
  mention: boolean
  followUp: boolean
  timestamp: string
}

const fallbackProfiles: Profile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', translation: 'DeepL', language: 'Chinese' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', translation: 'DeepL', language: 'Chinese' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', translation: 'DeepL', language: 'Chinese' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', translation: 'Google', language: 'Chinese' },
]

const fallbackConversations: Conversation[] = [
  { id: 'john', name: 'John', profileId: 'personal', profile: 'Personal', provider: 'WhatsApp', preview: 'Are you free tomorrow?', translated: '明天有空吗？', unread: true, favorite: true, mention: false, followUp: true, timestamp: '2026-08-31T08:00:00.000Z' },
  { id: 'client-a', name: 'Client A', profileId: 'work', profile: 'Work', provider: 'WhatsApp', preview: 'Can you send me the file?', translated: '你可以把文件发给我吗？', unread: true, favorite: false, mention: true, followUp: true, timestamp: '2026-08-31T07:30:00.000Z' },
  { id: 'david', name: 'David', profileId: 'telegram', profile: 'Personal', provider: 'Telegram', preview: 'See you later.', translated: '晚点见。', unread: false, favorite: true, mention: false, followUp: false, timestamp: '2026-08-30T12:00:00.000Z' },
]

const filterRules: Record<Filter, (conversation: Conversation) => boolean> = {
  All: () => true,
  Unread: (conversation) => conversation.unread,
  Mentions: (conversation) => conversation.mention,
  Favorites: (conversation) => conversation.favorite,
  'Follow Up': (conversation) => conversation.followUp,
}

function statusLabel(status: Status) {
  return status === 'connected' ? 'Connected' : status === 'attention' ? 'Attention' : status === 'disconnected' ? 'Disconnected' : 'Not configured'
}

function StatusDot({ status }: { status: Status }) {
  const label = statusLabel(status)
  return <span className={`status ${status}`} title={label} aria-label={label} />
}

function toConversation(
  item: UnifiedChatIndexedConversation,
  profiles: Profile[],
): Conversation {
  const profile = profiles.find((candidate) => candidate.id === item.profileId)
  const message = item.lastMessage
  return {
    id: item.id,
    name: item.title || item.participant?.displayName || 'Unknown',
    profileId: item.profileId,
    profile: profile?.name ?? item.profileId,
    provider: item.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram',
    preview: message?.text ?? '',
    translated: message?.translatedText ?? '',
    unread: item.unreadCount > 0,
    favorite: item.favorite,
    mention: item.mentionCount > 0,
    followUp: item.followUp,
    timestamp: item.updatedAt,
  }
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
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [conversationSettingsOpen, setConversationSettingsOpen] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [openingProfileId, setOpeningProfileId] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'local' | 'demo'>('demo')

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
          const nextConversations = inbox.map((item) => toConversation(item, nextProfiles))
          setConversations(nextConversations)
          setDataSource('local')
          const preferredProfile = nextProfiles.find((profile) => profile.id === active)
          const preferred = preferredProfile?.lastConversationId
            ? nextConversations.find((conversation) => conversation.profileId === preferredProfile.id && conversation.id === preferredProfile.lastConversationId)
            : undefined
          const first = preferred ?? nextConversations[0]
          if (first) setSelectedConversationKey(`${first.profileId}:${first.id}`)
        } else if (mounted) {
          const preferredProfile = nextProfiles.find((profile) => profile.id === active)
          if (preferredProfile?.lastConversationId) setSelectedConversationKey(`${preferredProfile.id}:${preferredProfile.lastConversationId}`)
        }
      } catch {
        if (mounted) {
          setProfiles(fallbackProfiles)
          setDataSource('demo')
        }
      } finally {
        if (mounted) setLoadingProfiles(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [])

  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? fallbackProfiles[0]
  const selectedConversation = conversations.find((conversation) => `${conversation.profileId}:${conversation.id}` === selectedConversationKey) ?? conversations[0]

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return conversations.filter((conversation) => {
      const matchesFilter = filterRules[filter](conversation)
      const matchesSearch = !query || `${conversation.name} ${conversation.profile} ${conversation.provider} ${conversation.preview} ${conversation.translated}`.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [conversations, filter, search])

  useEffect(() => {
    const cleanupLock = window.unifiedChat?.onQuickLock(() => setLocked(true))
    const cleanupSwitch = window.unifiedChat?.onQuickSwitch((index) => {
      const target = profiles[index]
      if (target) void openProfile(target)
    })
    return () => {
      cleanupLock?.()
      cleanupSwitch?.()
    }
  }, [profiles])

  const openProfile = async (profile: Profile) => {
    setActiveId(profile.id)
    const last = conversations.find((conversation) => conversation.profileId === profile.id && conversation.id === profile.lastConversationId)
    if (last) setSelectedConversationKey(`${last.profileId}:${last.id}`)
    setOpeningProfileId(profile.id)
    try {
      await window.unifiedChat?.openProfile(profile.id)
    } finally {
      setOpeningProfileId(null)
    }
  }

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversationKey(`${conversation.profileId}:${conversation.id}`)
    setActiveId(conversation.profileId)
    setView('chats')
    void window.unifiedChat?.setLastConversation(conversation.profileId, conversation.id)
  }

  const backupProfile = async (profile: Profile) => {
    setBackupStatus(null)
    try {
      const result = await window.unifiedChat?.backupProfile(profile.id)
      if (result?.filePath) setBackupStatus(`Backup saved: ${result.filePath}`)
    } catch {
      setBackupStatus('Backup could not be created.')
    }
  }

  const addProfile = async () => {
    const index = profiles.length + 1
    const input: UnifiedChatProfileInput = {
      name: `Profile ${index}`,
      provider: 'WhatsApp',
      translation: 'DeepL',
      language: 'Chinese',
    }
    try {
      const created = await window.unifiedChat?.createProfile(input)
      if (created) {
        setProfiles((items) => [...items, created])
        setActiveId(created.id)
        setView('chats')
        await openProfile(created)
      }
    } catch {
      // Keep the shell usable if persistence is temporarily unavailable.
    }
  }

  const switchView = (next: View) => {
    setView(next)
    if (next !== 'search') setSearch('')
  }

  if (loadingProfiles) {
    return <main className="vault"><div className="vault-card"><div className="vault-logo">UC</div><h1>Unified Chat</h1><p>Loading Profiles…</p></div></main>
  }

  if (locked) {
    return (
      <main className="vault">
        <div className="vault-card">
          <div className="vault-logo">UC</div>
          <h1>Unified Chat</h1>
          <p>🔐 Profile Vault</p>
          <button className="primary" onClick={() => setLocked(false)}>Unlock</button>
          <button className="ghost" onClick={() => setLocked(false)}>Trusted Device</button>
        </div>
      </main>
    )
  }

  return (
    <main className={focusMode ? 'app focus' : 'app'}>
      <header className="topbar">
        <div className="brand-group">
          <button className="icon-button" aria-label="Menu">☰</button>
          <button className="brand brand-button" onClick={() => switchView('chats')}>Unified Chat</button>
          <label className="search">
            <span>⌕</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setView('search') }} placeholder="Search everywhere..." />
          </label>
        </div>
        <div className="top-actions">
          <div className="profile-switch-wrap">
            <button className="profile-switch" onClick={() => setProfileMenuOpen((open) => !open)}>
              <StatusDot status={active.status} /> {active.name} <span className="provider-label">{active.provider}</span> ▾
            </button>
            {profileMenuOpen && (
              <div className="profile-menu">
                <div className="menu-title">Profiles</div>
                {profiles.map((profile) => (
                  <button key={profile.id} className="profile-option" onClick={() => { void openProfile(profile); setProfileMenuOpen(false); setView('chats') }}>
                    <StatusDot status={profile.status} />
                    <span>{profile.name}</span>
                    <small>{profile.provider}</small>
                  </button>
                ))}
                <button className="new-profile" onClick={() => { void addProfile() }}>＋ New Profile</button>
              </div>
            )}
          </div>
          <button className="icon-button" aria-label="Notifications">♢</button>
          <button className="icon-button" aria-label="Lock" onClick={() => setLocked(true)}>🔒</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-title">Chats</div>
          <nav className="filters">
            {(['All', 'Unread', 'Mentions', 'Favorites', 'Follow Up'] as Filter[]).map((item) => (
              <button key={item} className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); setView('chats') }}>{item}</button>
            ))}
          </nav>
          <div className="conversation-list">
            {visibleConversations.map((conversation) => (
              <button key={`${conversation.profileId}:${conversation.id}`} className={selectedConversationKey === `${conversation.profileId}:${conversation.id}` ? 'conversation selected' : 'conversation'} onClick={() => selectConversation(conversation)}>
                <div className="avatar">{conversation.name.slice(0, 1)}</div>
                <div className="conversation-body">
                  <div className="conversation-top"><strong>{conversation.name}</strong>{conversation.unread && <span className="unread-dot" />}</div>
                  <div className="conversation-meta">{conversation.provider} · {conversation.profile}</div>
                  <div className="preview">{conversation.preview || 'No messages yet.'}</div>
                </div>
              </button>
            ))}
            {visibleConversations.length === 0 && <div className="empty-state">No conversations found.</div>}
          </div>
          <button className={view === 'profiles' ? 'profiles-link active-link' : 'profiles-link'} onClick={() => switchView('profiles')}>◉ Profiles</button>
          <button className={view === 'settings' ? 'profiles-link active-link' : 'profiles-link'} onClick={() => switchView('settings')}>⚙ Settings</button>
        </aside>

        {view === 'profiles' ? (
          <section className="panel-page">
            <div className="page-heading">
              <div><h2>Profiles</h2><p>Independent chat workspaces. Browser details stay hidden.</p></div>
              <div className="page-actions">
                <button className="ghost compact" onClick={() => { void backupProfile(active) }}>Backup {active.name}</button>
                <button className="primary compact" onClick={() => { void addProfile() }}>＋ New Profile</button>
              </div>
            </div>
            {backupStatus && <div className="backup-status">✓ {backupStatus}</div>}
            <div className="profile-grid">
              {profiles.map((profile) => (
                <button key={profile.id} className="profile-card" onClick={() => { void openProfile(profile) }} disabled={openingProfileId === profile.id}>
                  <div className="profile-card-top"><StatusDot status={profile.status} /><strong>{profile.name}</strong><span>{profile.provider}</span></div>
                  <div className="health-row"><span><StatusDot status={profile.status} /> Session</span><span><StatusDot status={profile.status} /> Messages</span></div>
                  <div className="health-row"><span><StatusDot status={profile.status} /> Network</span><span><StatusDot status={profile.status} /> Translation</span></div>
                  {profile.status === 'attention' && <div className="attention-banner">🟡 Session needs attention</div>}
                  <div className="profile-open-hint">{openingProfileId === profile.id ? 'Opening…' : 'Open workspace →'}</div>
                </button>
              ))}
            </div>
          </section>
        ) : view === 'settings' ? (
          <section className="panel-page">
            <div className="page-heading"><div><h2>Settings</h2><p>Global defaults. Profile and conversation settings can override these.</p></div></div>
            <div className="settings-card">
              <div><strong>Translation Router</strong><span>DeepL first, Google automatic fallback</span></div><span className="setting-value">DeepL → Google</span>
              <div><strong>Translation Style</strong><span>Natural tone · Natural length</span></div><span className="setting-value">Natural</span>
              <div><strong>Display</strong><span>Show original and translated messages</span></div><span className="setting-value">Bilingual</span>
              <div><strong>Security</strong><span>Quick Lock: Ctrl + Shift + L</span></div><span className="setting-value">Enabled</span>
              <div><strong>Profile Backup</strong><span>Exports settings only. Credentials and browser storage stay local.</span></div><span className="setting-value">Safe by default</span>
            </div>
          </section>
        ) : (
          <section className="chat">
            <div className="chat-header">
              <div>
                <div className="chat-title">{selectedConversation?.name ?? 'No conversation'} <span className="online">●</span></div>
                <div className="chat-subtitle">{selectedConversation?.provider ?? active.provider} · {selectedConversation?.profile ?? active.name} · {profiles.find((profile) => profile.id === selectedConversation?.profileId)?.translation ?? active.translation}</div>
              </div>
              <div className="chat-actions">
                <span className="data-source">{dataSource === 'local' ? 'Local data' : 'Demo data'}</span>
                <button className="ghost" onClick={() => setConversationSettingsOpen((value) => !value)}>Conversation Profile</button>
                <button className="ghost" onClick={() => setFocusMode((value) => !value)}>{focusMode ? 'Exit Focus' : 'Focus'}</button>
              </div>
            </div>
            {conversationSettingsOpen && (
              <div className="conversation-profile">
                <strong>Conversation Profile</strong><span>English → Chinese</span><span>{profiles.find((profile) => profile.id === selectedConversation?.profileId)?.translation ?? active.translation}</span><span>Natural</span><span>Bilingual</span><span>AI · Casual</span>
              </div>
            )}
            <div className="messages">
              {selectedConversation ? (
                <>
                  <div className="message incoming"><div className="bubble original">{selectedConversation.preview}</div>{selectedConversation.translated && <div className="bubble translation">{selectedConversation.translated}</div>}</div>
                  <div className="message outgoing"><div className="bubble original">Yeah, probably.</div><div className="bubble translation">应该有空。</div></div>
                </>
              ) : <div className="empty-state">Select a conversation to start.</div>}
            </div>
            <div className="composer-wrap">
              {aiMenuOpen && <div className="ai-menu"><div className="menu-title">✨</div>{['Reply', 'Rewrite', 'Explain', 'Summarize', 'Translate'].map((action) => <button key={action} onClick={() => setAiMenuOpen(false)}>{action}</button>)}</div>}
              <div className="composer">
                <button className="icon-button">＋</button>
                <input placeholder="Type a message..." />
                <button className="icon-button" title="Translation">🌐</button>
                <button className="icon-button" title="AI Assist" onClick={() => setAiMenuOpen((open) => !open)}>✨</button>
                <button className="send">➤</button>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
