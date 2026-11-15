# Privileged Gateway Intents

leek requests one privileged intent: **Message Content**. It no longer requests **Server Members**.

## Message Content (`MESSAGE_CONTENT`)

### Paste-ready justification

> leek is a moderation and community-management bot. Message Content is needed for four features that react to ordinary messages. None of them can be driven by slash commands, because they act on messages members send in configured channels:
>
> 1. **Imageboards.** Staff mark channels as media-only. leek checks each new message in those channels for a link or attachment and deletes text-only messages. Without content, every message looks empty and would be wrongly deleted.
> 2. **Deleted message logs.** When a message is deleted, leek posts its text to a staff-only log channel in the same server so moderators can review rule-breaking content that was removed.
> 3. **Member verification.** New members post their name and team (for example "Alex | 1234A") in a welcome channel. leek parses this to build a queue that staff approve in bulk, which sets the member's nickname and roles. `/verify rescan` re-reads recent welcome-channel messages to catch requests missed during downtime.
> 4. **Name change requests.** Members post the nickname they want in a request channel. When a moderator approves with a reaction, leek applies the message text as the member's nickname.
>
> leek only acts on content in channels a server's staff explicitly configured, except for deleted-message logging, which servers opt into. Content is never stored in our database, only held briefly in the in-memory message cache, and never leaves the server it came from. We don't use content for analytics, advertising, or AI training. Privacy policy: https://github.com/Battlesquid/leek-ts/blob/main/PRIVACY.md

### Feature details

| Feature | Event | How content is used | Why alternatives don't work |
| --- | --- | --- | --- |
| Imageboards (`src/listeners/imageboard_check.ts`) | Message Create | Tests `message.content` for a URL. Messages with no URL, no attachment, and no whitelisted role are deleted. | Enforcement must run on every message in the channel. Without content, messages that contain only links look empty and would be deleted. |
| Message logs (`src/listeners/log.ts`) | Message Delete | Copies the cached `message.content` of a deleted message into the server's message log channel. | The content is gone once a message is deleted. It can't be fetched later or supplied by a command. |
| Message verification (`src/listeners/verify_request.ts`, `/verify rescan`) | Message Create, channel history | Parses `Name \| Team` from messages in the new user channel. | New members expect to just type in the welcome channel. leek also offers a modal-based `/verify request` alternative, but many servers use the message flow, and rescan must read existing messages. |
| Name change requests (`src/listeners/name_change_request*.ts`) | Message Create, Message Reaction Add | Reacts to new requests, then applies `message.content` as the nickname on approval. | The request is the message itself, and approval happens through a reaction rather than an interaction. |

**Doesn't need the intent:** **Add to Hall of Fame** is a message context menu command. Discord includes the target message's content in the interaction payload, so it works without Message Content.

### Data handling

- Message content is never written to the database. The only user data stored is a pending verification request: user ID and the 32-character nickname derived from it.
- discord.js keeps recent messages in memory so deleted messages can be logged. This cache is cleared on restart.
- Reposted content (deleted message logs and hall of fame posts) stays in the server it came from.

## Server Members (`GUILD_MEMBERS`): no longer requested

leek never listened to member join, leave, or update events. Every member lookup now uses an approach that doesn't need the intent:

| Usage | Approach |
| --- | --- |
| Reactroles add/remove, name change approval (reacting member and target) | REST `GET /guilds/{id}/members/{user}` via `members.fetch({ user, force: true })` |
| `/verify rescan` checks roles of up to 100 authors | Gateway Request Guild Members by `user_ids`. Discord only requires the intent for full member lists (`query: ""`). |
| `/verify request`, `/timeout` | Member data included in the interaction payload |
| `/verify list` approval | REST `PATCH /guilds/{id}/members/{user}` |

Because member update events are no longer received, cached members can go stale. Every place that checks a member's roles or permissions fetches with `force: true` so it always sees current data. A sweeper clears the member cache hourly so it can't grow without bound.

### Rollout

1. Deploy this code, which no longer requests `GuildMembers` in `src/index.ts`.
2. Then, in the Developer Portal under **Bot → Privileged Gateway Intents**, turn off **Server Members Intent**.

Do these in order. If the bot requests an intent that is turned off in the portal, Discord closes the gateway connection with `4014 Disallowed intents`.
