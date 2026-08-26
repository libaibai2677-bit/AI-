# Unified Chat Architecture

## Four layers

### 1. Profile Layer

The Profile Layer owns independent communication workspaces.

Each Profile must isolate:

- session
- cookies
- Local Storage
- IndexedDB
- cache
- window state
- network settings
- translation settings
- AI settings

The application UI presents a chat account identity rather than browser terminology.

Examples:

- WhatsApp · Personal
- WhatsApp · Work
- WhatsApp · Business
- Telegram · Personal

### 2. Message Layer

The Message Layer normalizes messages from supported providers into a provider-neutral internal model.

Core concepts:

- Provider
- Account/Profile
- Conversation
- Participant
- Message
- Attachment
- Read state
- Mention
- Favorite
- Follow-up

This allows Unified Inbox and global search to work across platforms without coupling the UI to a single provider.

### 3. Intelligence Layer

The Intelligence Layer contains translation and optional AI.

Translation flow:

```text
Incoming message
      ↓
Language detection
      ↓
Local translation cache
      ↓
Batch / context handling
      ↓
DeepL
      ↓
Google fallback
      ↓
Rendered translation
```

AI is intentionally secondary and hidden behind the `✨` action.

Supported actions for V1:

- Reply
- Rewrite
- Explain
- Summarize
- Translate

### 4. Local Data Layer

Local-first persistence stores application state on the user's device by default.

Responsibilities:

- Profile metadata
- Local configuration
- Translation cache
- Translation Memory
- Personal dictionaries
- Conversation preferences
- Search index
- UI preferences

Sensitive provider credentials/session data must use OS-backed secure storage where possible.

## Settings precedence

```text
Global Settings
      ↓
Profile Settings
      ↓
Conversation Settings
```

The most specific applicable setting wins.

## Profile lifecycle

```text
Create Profile
      ↓
Create isolated storage environment
      ↓
Connect provider
      ↓
Restore session on future launches
      ↓
Open last conversation
```

Profile cloning copies configuration but must not copy provider login credentials by default.

## Security boundary

Profile isolation is a privacy and multi-account separation feature. Do not add automated fingerprint randomization, anti-detection behavior, or mechanisms intended to bypass provider security controls.
