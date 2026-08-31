# Message Provider Contract

The Message Layer is platform-neutral. WhatsApp and Telegram are adapters behind one provider boundary.

## Responsibilities

A provider adapter owns:

- provider-specific login/session behavior
- provider-specific conversation and message retrieval
- connection status
- opening a native conversation when supported
- sending a message when supported
- producing a normalized `ProviderSnapshot`

The rest of Unified Chat consumes normalized conversations and messages. It must not contain WhatsApp- or Telegram-specific parsing logic.

## Profile isolation

Every provider operation receives a `profileId`. Provider state must remain scoped to that Profile. A provider adapter must never reuse session/storage state across Profiles.

## Translation boundary

Providers deliver source messages to the Message Layer. Translation belongs to the Intelligence Layer and is applied after normalization. Provider adapters should not call DeepL, Google, or AI services directly.

## Adding a future platform

To add another platform:

1. Implement `MessagingProvider`.
2. Register it with `MessagingProviderRegistry`.
3. Emit normalized `Conversation` / `Message` data through `ProviderSnapshot`.
4. Keep provider-specific code inside the adapter.

No change to the Unified Inbox, global search, Translation Router, Translation Memory, or Conversation Profile model should be required merely to add a new provider.
