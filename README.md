# Unified Chat

A local-first multi-profile communication workspace for WhatsApp and Telegram, with unified messaging and intelligent translation.

## Product principles

- **No Unified Chat account** — open the app and use it.
- **Local first** — settings, caches, and profile configuration stay on the device by default.
- **Multiple isolated Profiles** — each chat account gets its own isolated session/storage environment.
- **Chat first** — no CRM dashboard, campaigns, or unnecessary clutter.
- **Translation Router** — DeepL first, Google as fallback.
- **Conversation-aware translation** — cache, batching, personal style, and translation memory.
- **Optional AI** — Reply, Rewrite, Explain, Summarize, Translate.

## Architecture

```text
                    Unified Chat
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Profile Layer    Message Layer    Intelligence Layer
        │                │                │
   多账号隔离        统一聊天          翻译 / AI
        │                │                │
        └────────────────┼────────────────┘
                         ↓
                  Local Data Layer
```

## Profile isolation

A Profile is a complete digital workspace, not a browser tab. It owns its own session, cookies, Local Storage, IndexedDB, cache, window state, network settings, translation settings, and AI settings.

The UI exposes **Profiles** such as `WhatsApp · Personal`, `WhatsApp · Work`, and `Telegram · Personal`; implementation details of the isolated browser environment remain hidden from users.

Isolation is intended for legitimate multi-account separation and privacy. The project does not implement mechanisms designed to evade platform security or abuse detection.

## V1 roadmap

1. Desktop shell and chat-first UI
2. Profile Manager and isolated Profile storage
3. Profile quick switch and status center
4. Profile Vault, locking, backup/export of non-sensitive configuration
5. WhatsApp / Telegram connection layer
6. Unified Inbox
7. Global cross-profile search
8. DeepL / Google translation router
9. Local translation cache and message batching
10. Personal Translation Style and Translation Memory
11. Conversation-level settings
12. Optional AI Assist

## Development

The repository starts intentionally small. Architecture and contracts are kept platform-neutral so additional messaging providers can be added without rewriting the application core.
