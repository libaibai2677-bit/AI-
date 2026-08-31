# V1 Implementation Status

This document locks the implementation to the agreed Unified Chat product definition.

## Locked product rules

- Product name: **Unified Chat**
- User-facing concept: **Profiles**, never Fingerprint or Browser accounts
- Local-first and no Unified Chat account required
- Profile isolation is for legitimate multi-account separation and privacy
- Chat-first UI: Chats, Profiles, Search, Settings
- WhatsApp + Telegram are first providers
- DeepL is the preferred translation provider; Google is automatic fallback
- Translation cache and batching are first-class
- Conversation settings override Profile settings, which override Global settings
- AI is optional and exposed through the `✨` action
- Sensitive provider credentials are not included in normal backups

## Implemented foundation

- Electron desktop shell
- React renderer
- Secure preload bridge
- Profile domain model
- Persistent local Profile Manager
- Per-Profile isolated data directory
- Per-Profile Electron persistent session partition
- Profile quick-switch shortcuts
- Quick Lock shortcut and Vault UI
- Provider-neutral message model
- Profile-scoped normalized message sync store
- Cross-Profile inbox aggregation foundation
- Translation Router with cache and DeepL-first / Google-fallback policy
- Router-level provider-native batch contract
- Consecutive-message translation batching foundation
- Provider boundary for WhatsApp and Telegram
- Chat-first UI prototype
- Active Profile selection persisted in local app state
- Profile runtime status persisted from provider window lifecycle
- Provider load failure changes Profile state to `Attention`
- Provider window close changes Profile state to `Disconnected`
- Successful provider load restores Profile state to `Connected`

## Next implementation order

### Profile Runtime

- [x] Persist active Profile selection.
- [x] Add initial provider runtime health lifecycle for session/window availability.
- [x] Add real Profile open/close lifecycle.
- [x] Restore the last conversation for each Profile.
- [x] Add safe configuration backup/export.
- [ ] Add safe configuration restore.
- [ ] Add OS-backed secret storage for provider credentials when needed.
- [ ] Expand health checks into separate Session / Network / Messages / Translation signals.

### Messaging

- [x] Open WhatsApp Web and Telegram Web inside the selected Profile runtime.
- [x] Keep provider session state isolated by Profile.
- [x] Add provider lifecycle status.
- [x] Build the normalized conversation/message synchronization layer foundation.
- [ ] Connect provider snapshots to persistent local message storage.
- [ ] Add unified inbox aggregation from live provider data.

### Translation

- [x] Add router-level provider-native batch contract.
- [x] Add consecutive-message batching foundation with a short debounce window.
- [ ] Add real DeepL adapter.
- [ ] Add real Google adapter.
- [ ] Add language detection.
- [ ] Add Profile Translation Memory and Personal Dictionary.
- [x] Add Conversation Profile UI and override model foundation.

### Intelligence

- [x] Add the hidden `✨` action menu.
- [ ] Implement Reply / Rewrite / Explain / Summarize / Translate as optional adapters.

## Security boundary

The application must not add anti-detection, fingerprint randomization, automated challenge solving, or mechanisms intended to bypass platform security or abuse-prevention controls. Isolation is implemented as normal application-level privacy and account separation.
