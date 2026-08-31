import React, { useState } from 'react'

type Profile = UnifiedChatProfile
type Props = { profiles: Profile[]; onProfilesChanged: (profiles: Profile[]) => void; onOpen: (profile: Profile) => void }

export function ProfileManager({ profiles, onProfilesChanged, onOpen }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<'WhatsApp' | 'Telegram'>('WhatsApp')
  const [language, setLanguage] = useState('Chinese')
  const [saving, setSaving] = useState(false)

  const addProfile = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const created = await window.unifiedChat?.createProfile({ name: trimmed, provider, translation: 'Google', language })
      if (created) onProfilesChanged([...profiles, created as Profile])
      setName('')
      setAdding(false)
    } finally { setSaving(false) }
  }

  return <div className="panel-page"><div className="page-heading"><div><h2>Profiles</h2><p>Each account is an independent workspace. Add as many WhatsApp or Telegram accounts as you need.</p></div><button className="primary compact" onClick={() => setAdding(true)}>＋ Add Profile</button></div>{adding && <div className="profile-create-card"><div className="drawer-header"><div><strong>New Profile</strong><small>Independent account workspace</small></div><button onClick={() => setAdding(false)}>×</button></div><label>Profile name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HK Work" autoFocus /></label><label>Platform<select value={provider} onChange={e => setProvider(e.target.value as 'WhatsApp' | 'Telegram')}><option>WhatsApp</option><option>Telegram</option></select></label><div className="profile-field"><span>Translation engine</span><div className="locked-provider">Google <small>Fixed</small></div></div><label>Target language<select value={language} onChange={e => setLanguage(e.target.value)}><option>Chinese</option><option>English</option><option>Japanese</option><option>Korean</option></select></label><button className="primary" disabled={!name.trim() || saving} onClick={() => void addProfile()}>{saving ? 'Creating…' : 'Create Profile'}</button></div>}<div className="profile-grid">{profiles.map(profile => <button key={profile.id} className="profile-card" onClick={() => onOpen(profile)}><div className="profile-card-top"><span className={`status ${profile.status}`} /><strong>{profile.provider} · {profile.name}</strong><span>Open ›</span></div><div className="health-row"><span>Translation · Google</span><span>{profile.language}</span></div></button>)}</div></div>
}
