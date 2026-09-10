# Discord Notifications Setup — Zero+

Total setup time: ~2 minutes. No account, no approval, no userId hunting.

## 1. Create a dedicated channel (recommended)
In your Discord server, make a private channel like `#order-alerts` that
only you (and maybe trusted mods) can see — keeps payment notifications
separate from the public support channel.

## 2. Create the webhook
1. Right-click the channel → **Edit Channel** → **Integrations** → **Webhooks**.
2. **New Webhook** → name it "Zero+ Bot" → copy the **Webhook URL**.
   It looks like: `https://discord.com/api/webhooks/123456789/AbCdEf...`

## 3. Set the environment variable
Add it to your hosting provider's environment variables (Cloudflare Pages
→ Settings → Environment variables) and to `.env.local` for local dev:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/AbCdEf...
```

Treat this URL as a secret — anyone who has it can post messages into your
channel. Don't commit it to the repo, don't paste it in a public chat.

## 4. Wire it into your order flow
```js
import { notifyDiscord, discordMessages } from '@/lib/notifyDiscord';

// after a customer uploads a slip:
await notifyDiscord(discordMessages.slipUploaded(order));

// after TrueMoney gift-link redemption succeeds:
await notifyDiscord(discordMessages.truemoneyAutoConfirmed(order));

// after you click Approve in the admin panel:
await notifyDiscord(discordMessages.slipApproved(order));

// after you click Reject:
await notifyDiscord(discordMessages.slipRejected(order));
```

`order` just needs `{ id, amount, method }` — the same shape the admin
verification queue in the mockup already uses.

## 5. Test it
```js
import { notifyDiscord } from '@/lib/notifyDiscord';
await notifyDiscord('test message from Zero+');
```
Call this from any API route once and check the channel — should land in
under a second. If nothing shows up, the most common cause is the webhook
URL got truncated when copy-pasting into the env var.

## About mobile — since you use your phone as your main device
Turn on push notifications for that specific channel: long-press the
channel → **Notification Settings** → **All Messages** (Discord defaults
some channels to "Only @mentions"). That's the one setting people usually
miss and then wonder why alerts aren't showing up on their phone.
