# Unified Chat V1 — Hidden AI Action Contract

This contract keeps AI inside the Intelligence Layer and preserves the product decision that AI is optional and visually hidden behind `✨`.

## User surface

The normal chat UI exposes one `✨` action button only.

```text
✨
 ├── Reply
 ├── Rewrite
 ├── Explain
 ├── Summarize
 └── Translate
```

There is no persistent AI Assistant panel, AI dashboard, model marketplace, or AI-specific primary navigation in V1.

## Boundary

The renderer sends an intent, the selected conversation context, and the text to the desktop Intelligence Layer. The renderer does not select a model provider directly.

```text
Chat UI
   ↓
AI Action
   ↓
Intelligence Layer
   ↓
Configured AI provider
```

This mirrors the Translation Router approach and keeps provider details out of the core chat experience.

## Context resolution

AI receives the same conversation identity used by Message Layer:

- Profile ID
- Conversation ID
- Source language
- Target language
- Recent normalized messages
- Effective conversation tone

The effective tone follows the existing specificity rule:

```text
Global Settings
      ↓
Profile Settings
      ↓
Conversation Settings
```

More specific settings win.

## Privacy rules

- AI is opt-in per action; opening a chat does not send messages to an AI provider.
- Only the context required for the selected action should be sent.
- Provider credentials remain in the desktop/main process and never cross the renderer boundary.
- No server-side conversation history is introduced by this contract.

## V1 actions

### Reply
Generate a suggested reply from the current conversation context.

### Rewrite
Rewrite user-provided text using the effective conversation tone and language settings.

### Explain
Explain meaning, intent, tone, or implied commitment of selected text.

### Summarize
Summarize the relevant recent conversation context.

### Translate
Translate selected text using the effective language settings. This is an AI action, not a replacement for the normal Translation Router.

## Non-goals

- Automatic AI replies.
- Background AI processing of every message.
- AI CRM or agent dashboard.
- Model/provider controls in the primary chat UI.
