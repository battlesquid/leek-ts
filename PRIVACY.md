# Privacy Policy

**Effective date:** November 15, 2026

This policy explains what information the leek Discord bot ("leek", "the bot", "we") collects, why, how long it is kept, and how to have it removed. It applies to every server the bot is added to and to every user who interacts with it.

leek is open source. Everything described here can be verified in the source code at <https://github.com/Battlesquid/leek-ts>.

## Summary

- leek stores **server configuration** (channel, role, and server IDs) that server staff set up with slash commands.
- The only user data leek stores in its database is **pending verification requests**: your user ID and requested nickname. These are deleted when you are verified or when the server disables verification.
- leek **reads message content** to provide moderation features (imageboards, deleted-message logs, verification, and name change requests). It does **not** store message content in its database.
- leek does **not** sell, rent, or share data with anyone for advertising or analytics, and does not use message content to train AI or machine learning models.

## Information we collect

### 1. Server configuration

When server staff configure a feature, leek saves the following, keyed by the server's ID:

| Feature | Data stored |
| --- | --- |
| Hall of Fame | IDs of channels designated as halls of fame |
| Imageboards | IDs of imageboard channels and whitelisted roles |
| Logs | IDs of the channels that receive message, image, and moderation logs |
| Name change requests | ID of the name change request channel |
| Verification | Verification type, new user channel ID, IDs of roles given on approval, and whether to post a greeting |

Reactroles and timeouts don't store any data in leek's database. Reactrole groups live in the Discord message that displays them.

### 2. Pending verification requests

If a server uses verification and you submit a request, by sending `Name | Team` in the server's new user channel or by using `/verify request`, leek stores:

- the server's ID,
- your Discord user ID, and
- the nickname built from your request (up to 32 characters).

Server staff can view pending requests with `/verify list`.

### 3. Message content

leek receives the content of messages in channels it can see. It only acts on the content in these cases:

| Feature | What leek does with content |
| --- | --- |
| Imageboards | Checks whether a message in an imageboard channel contains a link or attachment, and deletes it if not. |
| Message and image logs | When a message is deleted, posts its text and images to the server's configured log channel so that server's staff can review it. |
| Verification | Reads messages in the new user channel to find `Name | Team` requests. `/verify rescan` reads up to the last 100 messages of that channel. |
| Name change requests | When staff approve a request with a reaction, applies the message's text as the author's nickname. |
| Hall of Fame | When staff use **Add to Hall of Fame** on a message, reposts its text, images, and a link to it in the server's hall of fame channel. |

Message content is held only in the bot's short-lived in-memory cache, which is needed to log deleted messages, and is cleared when the bot restarts. It is never written to leek's database. Content that leek reposts, such as logs and hall of fame posts, is sent only to channels in the **same server** the message came from.

### 4. Operational logs

To keep leek running and debug problems, leek writes operational logs. These may include server, channel, message, and user IDs, usernames, verification nicknames, and, when a command fails, the details of that command invocation (the command used and the options provided). Logs are used only to operate and fix the bot and are kept for **[LOG RETENTION PERIOD]**.

### 5. Information Discord provides

Like every bot, leek receives information from Discord needed to function, such as server, channel, role, and member information and message reactions. leek only uses it to perform the features above.

## How information is used

Information is used only to provide leek's features as configured by each server's staff, and to operate, secure, and debug the bot. leek sends direct messages only to confirm or report problems with a verification request you submitted.

## Sharing

leek doesn't sell or share your information. Information is only processed by:

- **Discord**, which delivers all messages and events to and from the bot.
- **Infrastructure providers** that host leek's database and operational logs. They store the data on our behalf and may not use it for any other purpose.

Information may be disclosed if required by law or to comply with Discord's Terms of Service and Developer Policy.

## Retention and deletion

| Data | Kept until |
| --- | --- |
| Server configuration | Disabled with the feature's command, for example `/logs disable` or `/hall_of_fame disable`, or on request |
| Pending verification requests | You are verified, or the server runs `/verify disable` |
| Message content | Bot restart (in memory only) |
| Operational logs | [LOG RETENTION PERIOD] |

Removing leek from a server does **not** automatically delete that server's configuration. To have all data for a server or for your user ID deleted, contact us (see below) with the relevant server or user ID. Requests are completed within 30 days.

Server staff can see the current configuration at any time with `/settings`.

## Security

Data is stored in an access-controlled database. Credentials are managed with a secrets manager and are never committed to source control. No system is perfectly secure, but we take reasonable measures to protect stored data.

## Children

leek is intended for use on Discord, which requires users to be at least 13 years old, or older where local law requires. leek doesn't knowingly collect information from anyone under that age.

## Your rights

Depending on where you live, you may have rights to access, correct, or delete your information, or to object to its processing. To exercise any of these rights, contact us using the details below.

## Changes

If this policy changes, the updated version will be posted at this location with a new effective date. Material changes will also be noted in the repository's commit history.

## Contact

For questions or data requests: **[CONTACT METHOD, such as an email address or support server invite]**
