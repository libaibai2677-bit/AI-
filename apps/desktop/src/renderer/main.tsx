import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Provider = 'WhatsApp' | 'Telegram'
type Status = 'connected' | 'attention' | 'disconnected' | 'not-configured'

type Profile = {
  id: string
  name: string
  provider: Provider
  status: Status
  translation: 'DeepL' | 'Google'
}

const initialProfiles: Profile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', translation: 'DeepL' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', translation: 'DeepL' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', translation: 'DeepL' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', translation: 'Google' },
]

const conversations = [
  { name: 'John', profile: 'Personal', provider: 'WhatsApp', preview: 'Are you free tomorrow?', translated: '明天有空吗？', unread: true },
  { name: 'Client A', profile: 'Work', provider: 'WhatsApp', preview: 'Can you send me the file?', translated: '你可以把文件发给我吗？', unread: true },
  { name: 'David', profile: 'Personal', provider: 'Telegram', preview: 'See you later.', translated: '晚点见。', unread: false },
]

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
  const [focusMode, setFocusMode] = useState(false)

  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0]
  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) => `${conversation.name} ${conversation.preview} ${conversation.translated}`.toLowerCase().includes(query))
  }, [search])

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
          <div className="brand">Unified Chat</div>
          <label className="search">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations..." />
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
                  <button key={profile.id} className="profile-option" onClick={() => { setActiveId(profile.id); setProfileMenuOpen(false) }}>
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
            <button className="active">All</button>
            <button>Unread</button>
            <button>Mentions</button>
            <button>Favorites</button>
            <button>Follow Up</button>
          </nav>
          <div className="conversation-list">
            {visibleConversations.map((conversation) => (
              <button key={`${conversation.provider}-${conversation.name}`} className="conversation">
                <div className="avatar">{conversation.name.slice(0, 1)}</div>
                <div className="conversation-body">
                  <div className="conversation-top"><strong>{conversation.name}</strong>{conversation.unread && <span className="unread-dot" />}</div>
                  <div className="conversation-meta">{conversation.provider} · {conversation.profile}</div>
                  <div className="preview">{conversation.preview}</div>
                </div>
              </button>
            ))}
          </div>
          <button className="profiles-link">◉ Profiles</button>
          <button className="profiles-link">⚙ Settings</button>
        </aside>

        <section className="chat">
          <div className="chat-header">
            <div>
              <div className="chat-title">John <span className="online">●</span></div>
              <div className="chat-subtitle">WhatsApp · Personal · DeepL</div>
            </div>
            <button className="ghost" onClick={() => setFocusMode((value) => !value)}>{focusMode ? 'Exit Focus' : 'Focus'}</button>
          </div>
          <div className="messages">
            <div className="message incoming">
              <div className="bubble original">Are you free tomorrow?</div>
              <div className="bubble translation">明天有空吗？</div>
            </div>
            <div className="message outgoing">
              <div className="bubble original">Yeah, probably.</div>
              <div className="bubble translation">应该有空。</div>
            </div>
          </div>
          <div className="composer">
            <button className="icon-button">＋</button>
            <input placeholder="Type a message..." />
            <button className="icon-button" title="Translation">🌐</button>
            <button className="icon-button" title="AI Assist">✨</button>
            <button className="send">➤</button>
          </div>
        </section>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
