import React, { useEffect, useState } from 'react'

type ConversationProfile = {
  profileId: string
  conversationId: string
  sourceLanguage?: string
  targetLanguage?: string
  translationEngine?: 'DeepL' | 'Google'
  tone?: 'Natural' | 'Casual' | 'Professional'
  length?: 'Natural' | 'Short' | 'Detailed'
  display?: 'Original' | 'Bilingual' | 'Translated'
  aiTone?: 'Casual' | 'Business'
}

type Props = {
  profileId: string
  conversationId: string
  conversationName: string
  onClose: () => void
}

const defaults: Required<Omit<ConversationProfile, 'profileId' | 'conversationId'>> = {
  sourceLanguage: 'English',
  targetLanguage: 'Chinese',
  translationEngine: 'DeepL',
  tone: 'Natural',
  length: 'Natural',
  display: 'Bilingual',
  aiTone: 'Casual',
}

export function ConversationProfilePanel({ profileId, conversationId, conversationName, onClose }: Props) {
  const [value, setValue] = useState<ConversationProfile>({ profileId, conversationId })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setSaved(false)
    void window.unifiedChat?.getConversationProfile(profileId, conversationId).then((stored) => {
      if (!mounted) return
      setValue(stored ?? { profileId, conversationId })
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [profileId, conversationId])

  const resolved = { ...defaults, ...value }
  const update = <K extends keyof ConversationProfile>(key: K, next: ConversationProfile[K]) => {
    setSaved(false)
    setValue((current) => ({ ...current, [key]: next }))
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await window.unifiedChat?.setConversationProfile(value)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      await window.unifiedChat?.removeConversationProfile(profileId, conversationId)
      setValue({ profileId, conversationId })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="conversation-profile-panel" aria-label="Conversation Profile">
      <div className="conversation-profile-heading">
        <div><span className="eyebrow">Conversation Profile</span><h3>{conversationName}</h3><p>Overrides Profile and Global settings.</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
      </div>
      {loading ? <div className="profile-panel-loading">Loading…</div> : <>
        <label className="profile-field"><span>Language</span><div className="field-pair"><select value={resolved.sourceLanguage} onChange={(e) => update('sourceLanguage', e.target.value)}><option>English</option><option>Chinese</option><option>Japanese</option><option>Korean</option><option>French</option><option>German</option></select><span>→</span><select value={resolved.targetLanguage} onChange={(e) => update('targetLanguage', e.target.value)}><option>Chinese</option><option>English</option><option>Japanese</option><option>Korean</option></select></div></label>
        <label className="profile-field"><span>Translation</span><select value={resolved.translationEngine} onChange={(e) => update('translationEngine', e.target.value as ConversationProfile['translationEngine'])}><option>DeepL</option><option>Google</option></select></label>
        <label className="profile-field"><span>Style</span><select value={resolved.tone} onChange={(e) => update('tone', e.target.value as ConversationProfile['tone'])}><option>Natural</option><option>Casual</option><option>Professional</option></select></label>
        <label className="profile-field"><span>Length</span><select value={resolved.length} onChange={(e) => update('length', e.target.value as ConversationProfile['length'])}><option>Natural</option><option>Short</option><option>Detailed</option></select></label>
        <label className="profile-field"><span>Display</span><select value={resolved.display} onChange={(e) => update('display', e.target.value as ConversationProfile['display'])}><option>Original</option><option>Bilingual</option><option>Translated</option></select></label>
        <label className="profile-field"><span>AI</span><select value={resolved.aiTone} onChange={(e) => update('aiTone', e.target.value as ConversationProfile['aiTone'])}><option>Casual</option><option>Business</option></select></label>
        <div className="profile-panel-note">Only the fields you change are stored. Empty fields continue to inherit from the Profile, then Global settings.</div>
        <div className="profile-panel-actions"><button className="ghost" onClick={() => void reset()} disabled={saving}>Reset</button><button className="primary" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}</button></div>
      </>}
    </aside>
  )
}
