# AELTRIX Social v1 — real auth + online presence + P2P chat

A dark/green, Instagram-inspired mobile-friendly prototype for AELTRIX. This version adds a real Supabase Auth account flow, a searchable profiles table, global online presence, accept/decline invitations, automatic PeerJS signaling, copy/paste controls, and text-message encryption using ECDH + AES-GCM in addition to WebRTC's DTLS encryption.

## Before use: one-time setup

This is a static GitHub Pages app with hosted services. **You must configure Supabase**; a real account system cannot be created from HTML alone.

1. Create a project at https://supabase.com/.
2. Open **Project Settings → API** and copy the Project URL and `anon` / publishable key. Never use `service_role` in the browser.
3. In this folder, copy `config.example.js` to `config.js` and replace the two placeholder values.
4. Open Supabase **SQL Editor**, paste and run `supabase-schema.sql`.
5. In Supabase **Authentication → URL Configuration**, set your site URL to the GitHub Pages URL and add that URL to Redirect URLs.
6. In **Authentication → Providers → Email**, decide whether to require email confirmation. If enabled, users need to confirm email before logging in.
7. Make sure Supabase Realtime is available for Presence and Broadcast channels.
8. Upload `index.html`, `styles.css`, `app.js`, `logo.svg`, `config.js` to the repository root and enable GitHub Pages. Do not upload only `config.example.js`—the app needs your real `config.js`.

## What works in this prototype

- Sign up and sign in using Supabase Auth.
- Profile username/display name/bio; user search.
- Supabase Realtime Presence indicates users who have the app open and are connected to Realtime.
- Invite online users; the recipient can accept or decline.
- PeerJS performs signaling automatically, then WebRTC DataChannel carries messages peer-to-peer when the network permits.
- Text messages are encrypted with an ECDH-derived AES-GCM key; the app does not write message bodies to Supabase.
- Copy last message, paste from clipboard (browser permission-dependent), keyboard paste, Enter to send, Shift+Enter for newline.

## Security and network limitations — read this

- This is an early prototype, **not audited and not production-ready for sensitive conversations**.
- Supabase handles accounts, searchable profile metadata, presence, and invitations. It does not receive chat text in this implementation. PeerJS's public signaling service helps peers find one another; signaling metadata (peer IDs and connection events) is not private.
- WebRTC DataChannels are DTLS encrypted. This prototype additionally uses ECDH P-256 + HKDF + AES-GCM for message content. **Peer public keys are exchanged without a verified identity/fingerprint step**, so this does not yet protect against an active man-in-the-middle controlling signaling. Do not advertise this as a fully verified Signal-style E2EE system until peer identity keys are pinned/signed and the implementation is independently reviewed.
- A malicious browser extension, compromised endpoint, screenshot, or someone with access to a device can still see messages.
- PeerJS's public signaling broker and STUN help establish the connection; they do not guarantee it. Some networks need a TURN relay, which relays encrypted packets. This prototype does not configure a private TURN service, so some peers may fail to connect.
- Online status is best-effort while the page is open; background mobile tabs may be suspended. Invitations are real-time and do not persist if the recipient is offline.
- Profiles are searchable to signed-in users. Use RLS policies in the supplied SQL. Do not expose any Supabase service-role key.
- Image search/upload is **not implemented yet**. Planned image upload must validate `file.size <= 5 * 1024 * 1024` in the browser and enforce a matching server-side Storage policy.

## Troubleshooting

- `Invalid API key` / blank login: check `config.js`, project URL and anon/publishable key.
- `profiles` errors: run `supabase-schema.sql` and check RLS policies.
- Sign-up says confirmation required: confirm the email or disable confirmation for a private test project.
- Search returns no results: use at least two characters; usernames are lowercase letters/numbers/underscore.
- Presence empty: ensure Realtime works and both accounts are signed in to the same Supabase project.
- Invite fails: both tabs must be open and online; refresh both pages if peer IDs were not available yet.
- P2P does not connect: networks may block direct WebRTC. Configure TURN for reliable connectivity. Don't assume changing STUN will fix every network.

## Suggested next milestones

1. Add signed identity keys / fingerprint verification and a security review.
2. Add friend requests and a persistent friends list.
3. Add TURN credentials from a provider/server.
4. Add image transfer capped at 5 MB, with client and server-side validation.
5. Add abuse reporting, block controls, rate limits, account recovery, and privacy settings.
