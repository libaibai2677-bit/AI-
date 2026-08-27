# Unified Chat V1.0 Feature Specification

This specification locks the product direction established for Unified Chat. New implementation work should preserve the four-layer model and the chat-first UI.

## Product principles

- **No account**: Unified Chat does not require a service account.
- **Local first**: profiles, message index, translation cache, and settings are local by default.
- **Profiles, not browsers**: the user manages chat workspaces; browser isolation remains an implementation detail.
- **Chat first**: the primary navigation is Chats, Profiles, Search, Settings.
- **Provider neutral**: WhatsApp and Telegram are the first providers, with room for more later.

## Four-layer architecture

```text
Unified Chat
    |
    +-- Profile Layer       -> isolated chat workspaces
    +-- Message Layer       -> normalized conversations + unified inbox/search
    +-- Intelligence Layer  -> translation + optional AI
    +-- Local Data Layer     -> local persistence, cache, memory, settings
```

## V1 acceptance checklist

### Profile Layer

- [x] Profile naming and provider identity
- [x] Independent profile data directories
- [x] Profile quick switch
- [x] Ctrl/Cmd + 1..9 shortcuts
- [x] Connected / Attention / Disconnected / Not configured states
- [x] Profile management surface
- [ ] Persist active profile across restarts
- [ ] Real provider session lifecycle
- [ ] Last-conversation restore
- [ ] Backup / restore package
- [ ] OS-backed provider secret storage

### Message Layer

- [x] Normalized conversation model foundation
- [x] Chat-first inbox filters: All, Unread, Mentions, Favorites, Follow Up
- [x] Global search surface
- [x] Cross-profile search model foundation
- [ ] Live WhatsApp Web synchronization
- [ ] Live Telegram synchronization
- [ ] Unified inbox backed by provider adapters
- [ ] Message persistence and indexing

### Intelligence Layer

- [x] Translation Router abstraction
- [x] DeepL-first / Google-fallback policy
- [x] Translation cache abstraction
- [x] Translation batching abstraction
- [x] Profile-scoped translation memory foundation
- [x] Conversation Profile model foundation
- [x] Hidden `✨` AI entry point in chat UI
- [ ] Real DeepL adapter
- [ ] Real Google adapter
- [ ] Debounced consecutive-message batching
- [ ] Language detection
- [ ] Personal Dictionary editor
- [ ] Conversation override persistence
- [ ] Optional Reply / Rewrite / Explain / Summarize / Translate adapters

### Local Data Layer

- [x] Local profile persistence foundation
- [x] Isolated browser data path per profile
- [x] Translation cache foundation
- [ ] Durable message index
- [ ] Encrypted Profile Vault using OS credentials
- [ ] Trusted Device unlock policy
- [ ] Encrypted optional backup

## UI rules

The product must remain intentionally opposite to dashboard/CRM-style communication tools.

Primary navigation:

```text
Chats
Profiles
Search
Settings
```

Do not introduce Dashboard, CRM, Campaign, Automation, Statistics, or browser-management terminology into the primary UI.

The profile switcher must remain visible at the top of the chat workspace. Provider names may be shown as supporting metadata, but the browser implementation must never become the user's mental model.

## Settings precedence

```text
Global Settings
      |
      v
Profile Settings
      |
      v
Conversation Settings
```

The most specific setting wins.

## Translation pipeline

```text
Incoming message(s)
        |
        v
  Local cache lookup
        |
   miss / stale
        v
Translation Router
   |            |
 DeepL       Google fallback
        |
        v
Personal / Profile memory
        |
        v
Bilingual presentation
```

Consecutive short messages should be collected for a short debounce window and translated as one batch, while preserving the original message boundaries in the UI.

## Security boundary

Profile isolation is for legitimate account separation and privacy. The implementation must not add fingerprint randomization, anti-detection, automated challenge solving, or mechanisms intended to bypass platform security or abuse-prevention controls.
