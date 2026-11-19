# AELTRIX Social v1.6 — local-first chat + Sticker Studio

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

## v1.6 update notes and rollout
- Before upgrading, back up the project files and preserve the browser profile that contains local chats and stickers. The app does not migrate or delete local chat records. Existing local history continues to use the original persistent ECDH identity key; do not clear site data or replace that key if you need the history.
- Run the updated `supabase-schema.sql` in Supabase. It additively adds `signing_public_key` and explicitly grants authenticated profile operations; it does not delete profile rows or legacy cloud chat/media. Review the SQL and test it on a staging project before applying it to a production project.
- Both participants must use v1.6 for the signed handshake and image receipt acknowledgement. Older clients send unsigned handshakes and are not accepted as authenticated v1.6 peers.
- On first connection to a contact, the browser asks whether to trust that account's signing key and displays a SHA-256 fingerprint. This is trust-on-first-use (TOFU), not independent verification: compare fingerprints through a separate trusted channel if you need stronger assurance. A changed key is warned about and requires explicit confirmation; key changes can indicate legitimate device changes or an attack.
- The signed ephemeral key exchange binds the ephemeral key to the account IDs and invitation ID. It helps detect key substitution when the pinned signing key is correct, but does not protect against compromised endpoints, a compromised Supabase account/database before first trust, malicious app code, or stolen identity keys. This remains a prototype, not independently audited production cryptography.
- Image/sticker completion is shown only after the receiving client decrypts and persists the image locally and acknowledges it. This is not an offline delivery guarantee. PeerJS/WebRTC remains direct; no chat body or media bytes are stored on the server.
- v1.6 fixes the direction-dependent inbound chat identity mapping. Old local records stored under an incorrect self-contact ID are not automatically reassigned because the intended peer cannot be determined safely.
- Supabase still exposes profile discovery data to authenticated users under the searchable-profile policy. The new SQL explicitly removes anonymous table access and grants authenticated select/insert/update, with row-level policies limiting writes to the owner; profile fields are still available to authenticated users for discovery.
- The release was syntax-checked locally, but must still be tested with a configured Supabase project and two separate browser sessions before production use.
