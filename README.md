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
7. Give the bot role sufficient position and permissions for timeout/kick/ban and channel management. Assign `🛡️ Moderator` only to trusted staff.
8. Run `/setup` after deploying the update so the management channels receive private permission overwrites.

## Features

- Existing VYRA info, download, server, setup, clear, kick, and ban commands
- Moderation commands: `/warn`, `/timeout`, `/untimeout`, and `/slowmode`; role hierarchy is checked before member actions
- Staff-only management channels with restricted visibility
- Moderation logs for member joins/leaves, bans, message deletion/edits, moderation actions, and automatic flood protection
- Purple-themed channel/category setup and starter posts
- Welcome embeds and automatic VYRA Member role
- Private support tickets, with close/archive controls
- Suggestion and bug-report modals
- XP, levels, and leaderboard
- Staff announcement command and moderation log messages
- Optional GitHub release announcements

XP and release tracking are stored in the host's local `vyra-data.json` file. If your hosting provider uses an ephemeral filesystem, data may reset after a rebuild or redeploy; use persistent disk/database storage for long-term persistence.


## Yeni topluluk komutları

- `/daily`: 24 saatte bir 50–100 XP günlük ödül.
- `/profile [uye]`: üyenin seviye ve XP profilini gösterir.
- `/poll soru secenekler`: 2–5 seçenekli emoji oylaması oluşturur; seçenekleri virgülle ayır.

Komutlar bot yeniden başlatılıp Discord'a kaydedildikten sonra görünür. XP ve günlük ödül kayıtları `vyra-data.json` dosyasında tutulur; ücretsiz worker ortamı dosya sistemini sıfırlıyorsa kalıcı disk veya harici veritabanı gerekir.

- `/report uye sebep`: üyeyi özel yetkili rapor kanalına bildirir.


## VYRA Control Panel (optional)

The responsive web control panel uses Discord OAuth2, shows live server/bot stats, and can apply moderation actions. It remains disabled until all settings are configured.

Create an OAuth2 application in Discord Developer Portal and set these hosting environment variables:
- `DASHBOARD_CLIENT_ID`: OAuth2 application client ID
- `DASHBOARD_CLIENT_SECRET`: OAuth2 client secret (keep private)
- `DASHBOARD_REDIRECT_URI`: exact public callback URL, e.g. `https://YOUR-HOST/auth/callback`; add the same URL under OAuth2 Redirects
- `DASHBOARD_SESSION_SECRET`: random secret of at least 32 characters
- `DASHBOARD_GUILD_ID`: target Discord server ID (defaults to `GUILD_ID`)
- `PORT`: optional; use the port provided by your hosting service

Optional flood protection can be tuned with `AUTOMOD_MAX_MESSAGES` (default 7), `AUTOMOD_WINDOW_SECONDS` (default 8), and `AUTOMOD_TIMEOUT_MINUTES` (default 1). It uses message rate only and does not read message contents.\n\nThe service must expose its HTTP port publicly and use HTTPS. Only users with Administrator or Manage Server permission in the configured server can sign in. The bot role must be above members it moderates. Never publish OAuth secrets or the bot token. After configuration, open the deployed service root URL.
