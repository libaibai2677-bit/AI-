import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Provider = 'WhatsApp' | 'Telegram'
type Status = 'connected' | 'attention' | 'disconnected' | 'not-configured'
type View = 'chats' | 'profiles' | 'search' | 'settings'
type Filter = 'All' | 'Unread' | 'Mentions' | 'Favorites' | 'Follow Up'

type Profile = {
  id: string
  name: string
  provider: Provider
  status: Status
  translation: 'DeepL' | 'Google'
}

type Conversation = {
  name: string
  profile: string
  provider: Provider
  preview: string
  translated: string
  unread: boolean
  favorite: boolean
  mention: boolean
  followUp: boolean
}

const initialProfiles: Profile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', translation: 'DeepL' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', translation: 'DeepL' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', translation: 'DeepL' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', translation: 'Google' },
]

const initialConversations: Conversation[] = [
  { name: 'John', profile: 'Personal', provider: 'WhatsApp', preview: 'Are you free tomorrow?', translated: '明天有空吗？', unread: true, favorite: true, mention: false, followUp: true },
  { name: 'Client A', profile: 'Work', provider: 'WhatsApp', preview: 'Can you send me the file?', translated: '你可以把文件发给我吗？', unread: true, favorite: false, mention: true, followUp: true },
  { name: 'David', profile: 'Personal', provider: 'Telegram', preview: 'See you later.', translated: '晚点见。', unread: false, favorite: true, mention: false, followUp: false },
]

const filterRules: Record<Filter, (conversation: Conversation) => boolean> = {
  All: () => true,
  Unread: (conversation) => conversation.unread,
  Mentions: (conversation) => conversation.mention,
  Favorites: (conversation) => conversation.favorite,
  'Follow Up': (conversation) => conversation.followUp,
}

function StatusDot({ status }: { status: Status }) {
  const label = status === 'connected' ? 'Connected' : status === 'attention' ? 'Attention' : status === 'disconnected' ? 'Disconnected' : 'Not configured'
  return <span className={`status ${status}`} title={label} aria-label={label} />
}

function App() {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [activeId, setActiveId] = useState('personal')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [locked, setLocked] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('chats')
  const [filter, setFilter] = useState<Filter>('All')
  const [selectedConversation, setSelectedConversation] = useState('John')
  const [aiMenuOpen, setAiMenuOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [conversationSettingsOpen, setConversationSettingsOpen] = useState(false)

  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0]
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return initialConversations.filter((conversation) => {
      const matchesFilter = filterRules[filter](conversation)
      const matchesSearch = !query || `${conversation.name} ${conversation.profile} ${conversation.provider} ${conversation.preview} ${conversation.translated}`.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [filter, search])

  useEffect(() => {
    const cleanupLock = window.unifiedChat?.onQuickLock(() => setLocked(true))
    const cleanupSwitch = window.unifiedChat?.onQuickSwitch((index) => {
      const target = profiles[index]
      if (target) setActiveId(target.id)
    })
    return () => {
      cleanupLock?.()
      cleanupSwitch?.()
    }
  }, [profiles])

  const switchView = (next: View) => {
    setView(next)
    if (next !== 'search') setSearch('')
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
                  <button key={profile.id} className="profile-option" onClick={() => { setActiveId(profile.id); setProfileMenuOpen(false); setView('chats') }}>
                    <StatusDot status={profile.status} />
                    <span>{profile.name}</span>
                    <small>{profile.provider}</small>
                  </button>
                ))}
                <button className="new-profile" onClick={() => setProfiles((items) => [...items, { id: `profile-${items.length + 1}`, name: `Profile ${items.length + 1}`, provider: 'WhatsApp', status: 'not-configured', translation: 'DeepL' }])}>＋ New Profile</button>
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
              <button key={`${conversation.provider}-${conversation.name}`} className={selectedConversation === conversation.name ? 'conversation selected' : 'conversation'} onClick={() => { setSelectedConversation(conversation.name); setView('chats') }}>
                <div className="avatar">{conversation.name.slice(0, 1)}</div>
                <div className="conversation-body">
                  <div className="conversation-top"><strong>{conversation.name}</strong>{conversation.unread && <span className="unread-dot" />}</div>
                  <div className="conversation-meta">{conversation.provider} · {conversation.profile}</div>
                  <div className="preview">{conversation.preview}</div>
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
            <div className="page-heading"><div><h2>Profiles</h2><p>Independent chat workspaces. Browser details stay hidden.</p></div><button className="primary compact" onClick={() => setProfiles((items) => [...items, { id: `profile-${items.length + 1}`, name: `Profile ${items.length + 1}`, provider: 'WhatsApp', status: 'not-configured', translation: 'DeepL' }])}>＋ New Profile</button></div>
            <div className="profile-grid">
              {profiles.map((profile) => (
                <button key={profile.id} className="profile-card" onClick={() => { setActiveId(profile.id); setView('chats') }}>
                  <div className="profile-card-top"><StatusDot status={profile.status} /><strong>{profile.name}</strong><span>{profile.provider}</span></div>
                  <div className="health-row"><span><StatusDot status={profile.status} /> Session</span><span><StatusDot status={profile.status} /> Messages</span></div>
                  <div className="health-row"><span><StatusDot status={profile.status} /> Network</span><span><StatusDot status={profile.status} /> Translation</span></div>
                  {profile.status === 'attention' && <div className="attention-banner">🟡 Session needs attention</div>}
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
            </div>
          </section>
        ) : (
          <section className="chat">
            <div className="chat-header">
              <div>
                <div className="chat-title">{selectedConversation} <span className="online">●</span></div>
                <div className="chat-subtitle">WhatsApp · Personal · DeepL</div>
              </div>
              <div className="chat-actions">
                <button className="ghost" onClick={() => setConversationSettingsOpen((value) => !value)}>Conversation Profile</button>
                <button className="ghost" onClick={() => setFocusMode((value) => !value)}>{focusMode ? 'Exit Focus' : 'Focus'}</button>
              </div>
            </div>
            {conversationSettingsOpen && (
              <div className="conversation-profile">
                <strong>Conversation Profile</strong><span>English → Chinese</span><span>DeepL</span><span>Natural</span><span>Bilingual</span><span>AI · Casual</span>
              </div>
            )}
            <div className="messages">
              <div className="message incoming"><div className="bubble original">Are you free tomorrow?</div><div className="bubble translation">明天有空吗？</div></div>
              <div className="message outgoing"><div className="bubble original">Yeah, probably.</div><div className="bubble translation">应该有空。</div></div>
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
