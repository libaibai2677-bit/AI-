# Unified Chat — Global Search Flow

This flow is part of the fixed V1 product direction. Search is local-first and provider-agnostic.

## User flow

```text
Search everywhere...
        ↓
Local indexed message search
        ↓
Rank matches
        ↓
Search result
        ↓
Activate Profile
        ↓
Restore/open conversation
```

## Result contract

Each result identifies:

- Profile ID
- Provider
- Conversation ID and title
- Message ID
- Sender
- Original text
- Translated text when available
- Timestamp
- Match source: message / translation / sender / conversation

## Ranking

Direct message text matches are ranked before conversation-title-only matches. Within the same match class, newer messages appear first.

## Privacy

Search runs against the local message store. The query is not sent to WhatsApp, Telegram, or a remote search service.

## UX rules

- Search UI says **Search**, never Browser Search.
- Results may come from any Profile or supported provider.
- Selecting a result must leave the user in the normal chat UI.
- The selected Profile becomes active.
- The selected conversation becomes the Profile's last conversation.
- No CRM, contact-management, campaign, or analytics surface is introduced.
