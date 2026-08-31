# Unified Chat Architecture

## 1. System boundary

```text
┌─────────────────────────────────────────────────────────────┐
│                         Unified Chat                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Profiles   │  │   Messages   │  │  Intelligence    │  │
│  │              │  │              │  │                  │  │
│  │ isolation    │  │ normalized   │  │ translation      │  │
│  │ lifecycle    │  │ inbox/search │  │ memory/cache     │  │
│  │ health       │  │ conversation │  │ optional AI      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └──────────────────┼───────────────────┘            │
│                            ↓                                │
│                   ┌─────────────────┐                       │
│                   │  Local Data     │                       │
│                   │  configuration  │                       │
│                   │  normalized DB  │                       │
│                   │  cache/memory   │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
              │                         │
              ↓                         ↓
      isolated provider             provider APIs
        environments              DeepL / Google / AI
```

## 2. Desktop process model

```text
Electron Main
 ├── Profile Store
 ├── Profile Window Manager
 ├── Message Store
 ├── Provider Runtime Sync
 ├── Translation Router
 ├── Translation Memory
 ├── Conversation Profiles
 └── Secret Store
          │
          │ narrow IPC
          ↓
Renderer
 ├── Chats
 ├── Profiles
 ├── Search
 └── Settings
```

The renderer receives normalized application data only. Provider credentials and other secrets remain owned by the main process.

## 3. Profile isolation contract

Each Profile maps to its own persistent Electron session partition:

```text
persist:unified-chat-<profile-id>
```

The provider window uses:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- no Unified Chat preload bridge

The provider environment is therefore isolated from the application renderer. Provider pages are treated as untrusted third-party content.

The product intentionally uses isolation for legitimate multi-account separation and privacy. It must not add mechanisms intended to bypass provider security, anti-abuse systems, or detection controls.

## 4. Provider adapter contract

All messaging providers must eventually conform to a platform-neutral runtime boundary.

Conceptually:

```ts
interface MessagingProvider {
  connect(profileId: string): Promise<void>
  disconnect(profileId: string): Promise<void>
  sync(profileId: string): Promise<ProviderSnapshot>
}
```

The normalized snapshot is consumed by Message Layer and persisted in Local Data Layer. Provider-specific DOM details must not leak into the UI model.

V1 providers:

- WhatsApp
- Telegram

Future providers should be adapters, not rewrites of the application core.

## 5. Translation Router

```text
Message
  ↓
Conversation settings
  ↓
Profile settings
  ↓
Global settings
  ↓
Translation Router
  ├── DeepL (preferred)
  └── Google (fallback)
  ↓
Local translation cache
  ↓
Renderer
```

The router should produce a provider-neutral translation result and record which engine actually handled the request internally.

## 6. Translation batching

Consecutive short inbound messages from the same conversation can enter a short debounce window. The router sends one batch request rather than one request per message, then maps the result back to the original message boundaries.

This is an implementation optimization and must not change the user-visible message order.

## 7. Translation Memory

Translation Memory is scoped by Profile.

```text
Global defaults
     ↓
Profile dictionary
     ↓
Conversation override
```

A dictionary entry is a source phrase plus preferred target phrase. It is applied consistently before or during translation according to the provider adapter contract.

## 8. Conversation Profile

Conversation settings override Profile settings, which override Global settings.

Minimum fields:

- source / target language
- translation engine
- style
- display mode
- AI tone

## 9. Security boundaries

- Secrets are written/read only by the main process.
- Renderer can request secret presence but never reads secret values.
- Profile backup exports configuration only by default.
- Browser session data is not included in ordinary backup.
- Quick Lock hides application content in the renderer.
- Trusted Device behavior must be implemented using OS-backed secure storage rather than plaintext credentials.

## 10. V1 implementation order

1. Stabilize Profile lifecycle and persistent isolation.
2. Stabilize normalized Message Layer and unified inbox.
3. Finish global search across persisted messages.
4. Finish Translation Router + cache + batching.
5. Finish Profile-scoped Translation Memory.
6. Finish Conversation Profile precedence.
7. Finish Vault / Quick Lock / safe backup UX.
8. Add optional AI actions behind `✨`.
9. Validate WhatsApp and Telegram adapters independently.

The architecture should remain platform-neutral so adding another messaging provider does not require rewriting Profile, Message, Intelligence, or Local Data layers.
