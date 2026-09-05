# Legacy player migration

Old `players` documents used generated IDs and a `teamId`. They are still read
by `getPlayersByTeam()` when a team has no `members` array, so existing
tournaments are not modified or deleted.

To migrate a legacy player safely:

1. The person registers and receives a Firebase Authentication UID.
2. Create/verify `players/{uid}` as the profile document.
3. Add `{ uid, role }` to the corresponding `teams/{teamId}.members` array.
4. Set `captainUid` when applicable.
5. Archive the legacy document only after the team roster has been verified.

This must be an administrator-reviewed mapping because names are not unique and
must never be used to guess which account owns an old record.

## Dashboard compatibility

- Existing tournaments without `published` remain private until an admin edits
  them and enables publication.
- Existing teams without `approvalStatus` are treated as approved. Only new
  public applications use `pending`/`approved`/`rejected`.
- Existing categories continue to work without date, time, capacity or
  registration fields; the admin can add them incrementally.
- Existing matches remain tournament-level. Newly generated category schedules
  include `categoryId`, and replacing one category schedule does not delete
  matches from another category.
