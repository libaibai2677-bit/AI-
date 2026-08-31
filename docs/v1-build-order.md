# Unified Chat V1.0 Build Order

This document is the implementation gate for V1.0. It follows the four-layer product definition and does not introduce a dashboard, CRM, campaign, automation, or account-management product model.

## Product contract

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

## Build order

### Phase 1 — Shell + Local Data Layer

- Electron desktop shell.
- Local-first persistence.
- No Unified Chat account.
- Secure main/preload/renderer boundary.
- Profile metadata stored locally.

### Phase 2 — Profile Layer

- Profiles are the user-facing concept; never expose browser-profile terminology.
- One Profile maps to one isolated browser/session environment.
- Independent session, cookies, Local Storage, IndexedDB, cache, window state, network settings, translation settings, and AI settings.
- Profile Quick Switch.
- `Ctrl+1` through `Ctrl+9` quick switching.
- Status: Connected / Attention / Disconnected / Not configured.
- Restore last conversation when entering a Profile.
- Profile Backup exports configuration only by default.
- Credentials, tokens, cookies, and browser storage remain excluded unless a future encrypted migration feature explicitly supports them.
- Profile Vault and Quick Lock (`Ctrl+Shift+L`).
- Trusted Device remains optional; it must never weaken the explicit Quick Lock flow.

### Phase 3 — Message Layer

- Provider-neutral message model.
- WhatsApp and Telegram adapters.
- Unified Inbox: All / Unread / Mentions / Favorites / Follow Up.
- Cross-profile message persistence.
- Global search across Profile + provider + conversation + message text.
- Provider-specific details remain behind the adapter boundary.

### Phase 4 — Intelligence Layer

- Translation Router with DeepL as default and Google as fallback.
- Provider failure is handled internally; the normal chat UI does not expose routing complexity.
- Local translation cache.
- Consecutive-message batching before translation.
- Personal Translation Style: Tone / Length / Avoid.
- Profile-level Translation Memory / Personal Dictionary.
- Conversation Profile overrides.
- Resolution order:

```text
Global Settings
      ↓
Profile Settings
      ↓
Conversation Settings
```

More specific settings win.

### Phase 5 — Optional AI

AI remains hidden behind the `✨` action surface.

Supported actions:

- Reply
- Rewrite
- Explain
- Summarize
- Translate

No persistent AI dashboard or AI assistant panel is part of V1.

## UI contract

Primary navigation is limited to:

- Chats
- Profiles
- Search
- Settings

The default screen opens directly into the chat workspace.

The browser engine, isolated session implementation, and provider connection machinery are implementation details and must not become the product's primary UI.

## Acceptance gates

A V1 build is considered aligned only when all of the following are true:

1. A user can open the app without creating a Unified Chat account.
2. Profiles are presented as chat workspaces such as `WhatsApp · Personal` and `WhatsApp · Work`.
3. Switching Profiles restores the correct isolated environment and last conversation.
4. Profile state is visible without exposing browser internals.
5. Lock hides chat content and Quick Lock works with `Ctrl+Shift+L`.
6. Profile backup does not export sensitive login credentials by default.
7. Unified Inbox can combine messages from supported Profiles/providers.
8. Global Search crosses Profiles and providers.
9. Translation uses the Router model rather than provider-specific UI buttons.
10. Cached translations do not call the provider again.
11. Consecutive messages can be translated as a batch.
12. Profile and Conversation translation settings override global defaults correctly.
13. AI is optional and exposed only through the `✨` action surface.
14. No CRM, campaign, statistics, automation, or browser-management dashboard is introduced into the core experience.

## Technology decision

The current implementation remains on Electron + Chromium for V1. The abstraction boundary is kept platform-neutral so a later Tauri migration can be evaluated independently. Do not rewrite the architecture merely to change the desktop shell.

## Non-goals for V1

- Cloud account synchronization.
- Server-side message storage.
- Marketing automation.
- Bulk messaging.
- Campaign management.
- Anti-detection or security-evasion mechanisms.
- Exposing Chromium/Browser Profile controls to normal users.
