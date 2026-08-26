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
- Translation Router with cache and DeepL-first / Google-fallback policy
- Provider boundary for WhatsApp and Telegram
- Chat-first UI prototype

## Next implementation order

### Profile Runtime

1. Persist active Profile selection.
2. Add Profile health checks for session, network, messages, and translation.
3. Add real Profile open/close lifecycle.
4. Restore the last conversation for each Profile.
5. Add safe configuration backup and restore.
6. Add OS-backed secret storage for provider credentials when needed.

### Messaging

1. Open WhatsApp Web and Telegram Web inside the selected Profile runtime.
2. Keep provider session state isolated by Profile.
3. Add provider lifecycle status.
4. Build the normalized conversation/message synchronization layer.
5. Add unified inbox aggregation.

### Translation

1. Add real DeepL adapter.
2. Add real Google adapter.
3. Add language detection.
4. Add consecutive-message batching with a short debounce window.
5. Add Profile Translation Memory and Personal Dictionary.
6. Add Conversation Profile overrides.

### Intelligence

1. Add the hidden `✨` action menu.
2. Implement Reply / Rewrite / Explain / Summarize / Translate as optional adapters.

## Security boundary

The application must not add anti-detection, fingerprint randomization, automated challenge solving, or mechanisms intended to bypass platform security or abuse-prevention controls. Isolation is implemented as normal application-level privacy and account separation.
