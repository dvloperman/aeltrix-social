# AELTRIX Social v1.5.1 — local-first chat + Sticker Studio

A responsive Arabic-first social prototype with light/dark themes, Supabase account/profile discovery and presence, PeerJS/WebRTC direct chats, encrypted messages/images, replies, and a custom sticker maker.

## Setup
1. Create a Supabase project.
2. Copy `config.example.js` to `config.js` and add your Supabase project URL and public anon/publishable key. Never put a `service_role` secret in browser code.
3. Run `supabase-schema.sql` in the Supabase SQL Editor. For an existing project, it adds the public E2EE key column if needed and preserves profiles.
4. In Supabase Authentication URL Configuration, add your GitHub Pages URL. Ensure Realtime works for Presence/Broadcast.
5. Upload `index.html`, `styles.css`, `app.js`, `logo.svg`, and your own `config.js` to the repository root. Do not overwrite your real `config.js` with the example.

## Local-first storage
- Text messages and message metadata are encrypted with AES-GCM before being saved to IndexedDB. Images are encrypted before being saved to IndexedDB.
- Supabase is used for accounts, searchable profiles, public E2EE keys, online presence, and invitation signaling. The app does not write chat history or image bytes to Supabase.
- Your conversation list, message history, and sticker library are stored per browser/device. They do not automatically sync to another phone or computer. Clearing site data, using private/incognito browsing, or losing the browser profile can delete them.
- There is no encrypted backup/export-import flow in this version. Do not clear browser data if you need to preserve local chats.

## Sticker Studio
Open any conversation and tap **✨ Stickers**. Choose an image, optionally add a caption, preview it, then save it to your local library. Tap a saved sticker to send it in the currently open conversation. The same local library is available in other chats on that device. Stickers are stored locally and are not synced to other devices.

## Delivery and privacy limitations
- P2P delivery requires both participants to be online and successfully connected at the same time. This is not a full WhatsApp replacement: there is no server-side store-and-forward for offline recipients, and messages are not automatically synchronized between devices.
- Supabase and PeerJS still see account/profile or connection-signaling metadata. Message contents are encrypted in transit and local message records/media are encrypted before IndexedDB storage. The public E2EE keys are not verified with fingerprints, and this prototype has not received an independent security audit. Do not treat it as production-grade secure messaging.
- Existing encrypted `chat_messages` rows or media previously uploaded by v1.3 are left untouched in Supabase, but v1.5.1 does not read or import them. The SQL file does not delete them. Only delete old cloud data manually after confirming you no longer need it.
- Images and stickers must be smaller than 20 MiB to send. Some networks block direct WebRTC; reliable TURN configuration may be needed.

## Troubleshooting
- Invalid API key / setup warning: check `config.js` and ensure it uses the project URL and public anon/publishable key.
- Profile errors: run `supabase-schema.sql` and check RLS policies.
- Empty presence: both users must be signed in to the same Supabase project with Realtime available.
- Invite or connection fails: both users must be online; refresh both tabs if PeerJS IDs are stale. Some networks require TURN.


## v1.5.1 update notes
- Reworked the chat composer into a compact rounded message bar.
- Fixed incoming image/sticker transfer ordering by serializing received PeerJS packets.
- Reduced image chunks and added backpressure/progress handling to improve transfer reliability.
- Rebuilt sticker editor with name, caption, background, scale and text-size controls.
- Refreshed the UI with a purple/pink social look and fixed dark-theme surfaces.
- No Supabase schema changes are required for this frontend update.


### v1.5.1 auth startup hotfix
- Supabase client import is now handled dynamically. If the CDN import fails, the auth form still initializes and displays an actionable error instead of leaving the buttons unresponsive.
- Added an app.js version query to reduce stale browser-cache issues.
- No Supabase schema changes. Preserve your existing config.js.
