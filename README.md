# VYRA Bot

Official Discord bot for the VYRA community.

## Required environment variables

- `DISCORD_TOKEN`: bot token from the Discord Developer Portal
- `CLIENT_ID`: Discord application ID
- `GUILD_ID`: Discord server ID

## Optional environment variable

- `RELEASE_CHANNEL_ID`: channel ID where new stable releases from the public `mm2vault/VYRA` GitHub repository should be announced automatically. If unset, automatic release announcements remain disabled.

Never commit the bot token. Set environment variables in your hosting provider's secret/environment settings.

## First setup

1. Redeploy/restart the bot after updating the repository.
2. In your Discord server, run `/setup` once as an administrator.
3. Ensure the bot has Manage Channels, Manage Roles, Send Messages, Embed Links, Read Message History, and moderation permissions it needs.
4. Move the bot's role above the `💜 VYRA Member` role and any members it needs to moderate.
5. In Discord Developer Portal → Bot, enable the **Server Members Intent** so join welcomes and automatic member roles can work.
6. For message XP, the bot needs the Guild Messages gateway intent, which is enabled in the code. It counts messages without reading message contents.

## Features

- Existing VYRA info, download, server, setup, clear, kick, and ban commands
- Purple-themed channel/category setup and starter posts
- Welcome embeds and automatic VYRA Member role
- Private support tickets, with close/archive controls
- Suggestion and bug-report modals
- XP, levels, and leaderboard
- Staff announcement command and moderation log messages
- Optional GitHub release announcements

XP and release tracking are stored in the host's local `vyra-data.json` file. If your hosting provider uses an ephemeral filesystem, data may reset after a rebuild or redeploy; use persistent disk/database storage for long-term persistence.
