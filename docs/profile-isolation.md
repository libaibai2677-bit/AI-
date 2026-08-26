# Profile Isolation Contract

## Goal

Every Unified Chat Profile is an independent communication workspace. The application must never accidentally share provider session state between Profiles.

## Isolated state

Each Profile has its own namespace for:

- provider session data
- cookies
- Local Storage
- IndexedDB
- cache
- window state
- network configuration
- translation configuration
- AI configuration

## Storage layout concept

```text
profiles/
  <profile-id>/
    profile.json
    browser-data/
    cache/
    translation/
    ui/
```

The exact runtime layout is implementation-specific and must remain behind the Profile Core API.

## Profile Core API expectations

```text
createProfile(input)
getProfile(id)
listProfiles()
updateProfile(id, patch)
deleteProfile(id)
cloneProfile(id, options)
lockProfile(id)
unlockProfile(id)
getProfileHealth(id)
backupProfileConfig(id)
restoreProfileConfig(bundle)
```

## Credential rules

Provider credentials/session material are sensitive. They must not be placed in ordinary profile metadata or exported by default. Use an OS-backed secure credential mechanism where available.

A profile configuration backup contains settings and metadata, not provider authentication secrets, unless the user explicitly chooses an encrypted credential backup and the provider permits it.

## Runtime rules

1. Never reuse a provider session directory between Profiles.
2. Never copy provider credentials during ordinary Profile cloning.
3. Never expose browser-runtime implementation details in the primary UI.
4. Profile deletion must remove the associated local state after confirmation.
5. Locking a Profile must hide its conversation content.
6. Provider-specific code must depend on Profile Core contracts rather than reaching into other Profiles.

## Security boundary

Isolation is for legitimate multi-account separation and privacy. No anti-detection, automated fingerprint randomization, security-control bypass, or behavior intended to evade a provider's abuse-prevention systems is part of this contract.
