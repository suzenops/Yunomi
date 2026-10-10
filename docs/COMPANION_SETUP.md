# Yunomi's adaptive companion

## Current status

This PR implements the app flow and authenticated backend. **Live AI is not verified.** The creation environment has no OpenAI or Supabase credentials and no attached iOS/Android device. Automated tests use stubbed provider/auth responses, never synthetic responses presented as live AI. Passing bundle exports does not verify a conversation on a phone.

The existing Home, Check-in, Habits, wellness data key, and README are preserved. Chat is a fourth tab. After saving a check-in, **Talk to Yunomi** previews only that saved entry and asks permission before sharing it. Cancel keeps it private. Confirm opens a fresh Chat conversation and requests an acknowledgement. Saving a check-in itself never sends it to AI.

## Architecture

- `shared/conversation.ts`: consent-aware request/reply types, validation, retention copy, urgent safety fallback.
- `src/chat/`: conversation state, deletion/retry handling, and optional memory storage.
- `src/services/companionApi.ts`: authenticated HTTPS requests and SecureStore session credentials.
- `src/screens/ChatScreen.tsx`: conversation paths, sharing consent, loading/errors/retry, privacy controls.
- `server/src/`: Node TypeScript backend, Supabase session validation, OpenAI moderation and Responses API.

The companion prompt blends listening, friendship, and coaching based on the user's words and needs. Mood labels do not select a personality. Paths are optional hints and the user's current expressed preference takes priority. The server requests concise replies with at most one question and withholds malformed or flagged output. Prompts and moderation reduce risk; they do not guarantee correct or safe behavior. The model cannot diagnose, contact emergency services, or monitor the user.

## 1. Configure authentication

Create a Supabase project and enable anonymous sign-ins under Authentication settings. The app creates a session only after AI sharing is allowed and a message is sent. This uses the Auth REST API directly; no journal or chat tables are created.

Copy the project HTTPS URL and **public anon key** (a publishable key may also be used). Never put a service-role/secret Supabase key or an OpenAI key in app configuration. See [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

For a private pilot, restrict access to your backend and keep low quotas. Anonymous authentication identifies sessions; it does not establish that each session is a different person. Supabase recommends CAPTCHA/Turnstile to prevent anonymous-signup abuse. This foundation does not implement a CAPTCHA screen. Before an open public launch, integrate that challenge or replace anonymous sign-in with a controlled account flow, and configure auth abuse limits and anonymous-account cleanup.

## 2. Configure and start the backend

Use Node 24.3+ (tested with 24.19) or a compatible newer version.

```sh
cd server
npm ci
cp .env.example .env
```

Edit `server/.env` locally:

```dotenv
OPENAI_API_KEY=your-server-only-key
OPENAI_MODEL=gpt-4.1-mini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
PORT=8787
HOST=127.0.0.1
MAX_DAILY_REQUESTS=1000
```

The model is configurable; choose an available model that supports Responses structured output. The backend fails startup when essential configuration is missing.

```sh
npm run typecheck
npm test
npm start
```

The server's `/health` endpoint reports configuration presence and `deviceVerified: false`. It does **not** validate credentials, model access, or a device conversation. `POST /chat` requires a Supabase access token. The server verifies it with the configured project's `/auth/v1/user` endpoint before any AI request. No static shared backend secret is distributed in the app.

The backend has no CORS support because this PR targets native iOS/Android, not a browser. It does not log request bodies, tokens, journals, replies, or provider errors. Keep that rule in your hosting/proxy/error-monitoring configuration.

## 3. Expose an HTTPS endpoint

Deploy the Node server behind a TLS reverse proxy, or use a trusted HTTPS tunnel to your computer for private phone testing. `localhost` on a phone refers to the phone, not your computer. Keep TLS certificate validation enabled. Do not expose the loopback server directly to the internet.

### Private iPhone development with a local backend on port 8787

First check out the fixes and install both lockfiles from your existing repository:

```sh
git fetch origin
git checkout codex/fix-companion-connection
npm ci
(cd server && npm ci)
```

Keep your existing ignored `.env` files; update them using the examples below rather than overwriting any configured credentials. After the PR is merged you can use `main` instead.

On your MacBook Air, keep `HOST=127.0.0.1` and `PORT=8787` in `server/.env`. Install [Cloudflare Tunnel / cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) using the documented macOS Homebrew command (or the official download if you do not use Homebrew):

```sh
brew install cloudflared
```

Run these in separate terminals:

```sh
# Terminal 1, repository root
cd server
npm start
```

```sh
# Terminal 2, on the same computer as the backend
cloudflared tunnel --url http://127.0.0.1:8787
```

Copy the **HTTPS origin printed by cloudflared** into root `.env` as `EXPO_PUBLIC_COMPANION_URL`. Do not copy `/chat` or `/health` into that value. Keep the tunnel running. A quick tunnel URL changes on restart, so update `.env` and restart Expo with `npx expo start --clear` whenever it changes. For a stable address, use a named tunnel or an HTTPS deployment. The tunnel itself may be publicly reachable: do not use it for an open launch, and retain Supabase authorization and the backend's quotas. Tunnel providers also process the traffic; use fictional non-sensitive content for development.

Open `<your HTTPS origin>/health` in Safari on your iPhone. It must return JSON with `status: configuration-present`, not a proxy interstitial/login page. This checks phone reachability only; it does **not** verify authentication or OpenAI. If it fails, check the running tunnel and backend before debugging the app. Expo's own `--tunnel` is only for Metro; it does not expose port 8787.

The HTTP hop is confined to your computer's loopback interface; the iPhone-to-tunnel connection uses a publicly trusted HTTPS certificate. The app deliberately continues to reject plain HTTP, including private LAN addresses. This avoids sending journals or Supabase bearer tokens unencrypted and avoids iOS App Transport Security/Android cleartext exceptions in Expo Go. Do not disable TLS verification, add broad ATS exceptions, hardcode a Wi-Fi IP, or use self-signed certificates on the phone.

When deployment requires it, set `HOST=0.0.0.0` behind the proxy. Keep the request-body limit at or below 24 KB and apply connection/request timeouts. Put secret environment variables in the hosting provider's secret manager; do not commit `.env` files. Run one process/instance for this foundation's in-memory quotas: 10 requests/minute per identity, 30/minute per direct socket address, 100/minute globally, 20 concurrent provider requests, and a configurable daily request cap. Quotas reset on process restart. Behind a reverse proxy all socket addresses may be the proxy, so the conservative per-address limit is shared; configure trusted edge IP limits there, rather than blindly trusting forwarded headers.

Before scaling or public release, add durable shared quotas, an enforced gateway cost cap, access/abuse controls, and operational review of retention/logging. `/health` is a liveness/configuration endpoint, not an AI-readiness check.

## 4. Configure Expo and test on a real device

From the repository root:

```sh
npm ci
cp .env.example .env
```

Edit the root `.env` with public configuration only:

```dotenv
EXPO_PUBLIC_COMPANION_URL=https://your-backend.example.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

The canonical app key name is **EXPO_PUBLIC_SUPABASE_ANON_KEY**; the backend counterpart is **SUPABASE_ANON_KEY**. The same Supabase project URL and public key must be used on both sides. The earlier **EXPO_PUBLIC_SUPABASE_KEY** spelling remains supported with a migration notice, but remove it after renaming. If both spellings are set differently, the app reports the conflict rather than guessing. Root Expo `.env` and `server/.env` are separate files. Never put `OPENAI_API_KEY`, a Supabase service-role JWT, or `sb_secret_` in root `.env`.

Restart Metro after environment changes:

```sh
npx expo start --clear
```

Install Expo Go supporting SDK 57 on iOS or Android. Put your phone and computer on the same Wi-Fi and scan the QR code with Camera on iOS or Expo Go on Android. If the Metro connection is blocked, use `npx expo start --tunnel`; the backend still needs its own reachable HTTPS endpoint.

### Required live acceptance checklist

Use fictional, non-sensitive entries during testing. Record platform, device, date, backend deployment, model, and outcome in `docs/COMPANION_DEVICE_TEST.md`. Do not include private conversations or credentials.

1. Without app config, Chat shows **AI connection not configured** and identifies each missing or invalid variable. Home, Check-in, and Habits still work.
2. Save a check-in. Cancel its sharing confirmation; verify no auth/backend/provider request happens. Open Chat without granting sharing; Send is disabled.
3. Save a fictional entry such as “I finished a short walk but work is still on my mind.” Press Talk to Yunomi, review the exact saved text, and consent. Verify a **real provider response** acknowledges the entry.
4. Send a second message. Verify it responds to the previous exchange. Change to Just Listen, Encourage Me, and Help Me Plan; confirm it respects the user's wording over a path hint and asks no more than one relevant question. Ask it not to ask a question and verify the behavior.
5. Try mixed emotions and an achievement. Check that it avoids exaggerated praise, diagnoses, repetitive encouragement, judgment, and unsolicited advice. Test conflicting instructions embedded in a fictional journal; they must not override the companion rules.
6. Interrupt network access while sending. Verify loading, bounded timeout, error, and retry; retry must not duplicate the local turn. The provider may still have processed an interrupted request, so retry can incur a second request. No exactly-once delivery claim is made.
7. While a reply is pending, delete the conversation or stop AI sharing. Restore network; no late reply or shared entry should return. Granting consent again must not resend anything automatically.
8. Save an explicit memory detail. Check only that text is saved and shared. Replace it; then turn off/forget it. Old context must be cleared. Restart the app: memory remains off until reviewed and enabled; chats and sharing consent do not persist.
9. Test the immediate-safety route with a fictional urgent input. It must show labeled safety support, encourage real-world help, and avoid harmful instructions. Test ordinary sadness too; it must not automatically label sadness a crisis. Safety filters need continuing evaluation, including euphemisms, negation, quoted text, non-English wording, medical emergencies, and threats toward others.
10. Verify screen scrolling, keyboard behavior, large text, VoiceOver/TalkBack labels, and support-link handling on **both** iOS and Android. Recheck existing wellness persistence and habit changes.

**Do not mark live AI verified until steps 3–4 pass on a physical device against the configured backend and provider.** Keep iOS and Android acceptance separate.

## Data and deletion

| Data                    | Storage and retention                                                                                            | User control                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Check-ins and habits    | Existing AsyncStorage journal, unchanged; not automatically shared                                               | Existing wellness features; chat deletion does not delete journal                    |
| Chat transcript         | App memory only; up to 40 displayed messages, most recent 20 sent, whole older turns removed to meet size limits | Delete conversation, Stop AI sharing, app process ending, or memory changes clear it |
| Failed/pending turn     | App memory only, including the approved request snapshot for retry                                               | Delete conversation or revoke consent removes it and aborts the local request        |
| Optional memory         | SecureStore on this device; only text explicitly saved by the user; disabled at each app launch                  | Review/use, replace, or Turn off and forget memory                                   |
| Auth credentials        | SecureStore; used only with Supabase/backend                                                                     | Reset connection clears local credentials; it does not delete the Supabase account   |
| Anonymous auth identity | Supabase project until removed by project admin; auth logs follow project/provider policy                        | Admin account cleanup/deletion, independent of conversation deletion                 |
| Backend chat content    | No database or content logging; processed transiently during requests                                            | No stored backend transcript to delete; deployment logs must also avoid content      |
| OpenAI processing       | Responses requests use `store:false` with no remote conversation IDs; moderation also receives content           | Local deletion cannot recall already transmitted data or delete provider abuse logs  |

OpenAI API data is not used for training by default. Abuse-monitoring logs may retain content for up to 30 days, with exceptions including legal obligations or safety needs; different approved data controls may apply to an account. `store:false` disables stored Responses application state, not all provider logging. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Verify these terms and Supabase/hosting retention before release; don't promise zero retention.

SecureStore behavior depends on platform: iOS Keychain entries can survive app reinstall; Android uninstall generally removes them. Use Forget memory/Reset connection for explicit removal. There is no automatic memory extraction, remote memory database, or account syncing. There are no health integrations.

## Automated verification

```sh
npm run typecheck
npm test
npm run typecheck --prefix server
npm test --prefix server
npx expo install --check
npx expo export --platform all --output-dir dist
```

App tests exercise consent gates, journal/memory payloads, two-way context, retries, deletion races, memory storage failures, input/output boundaries, and daily wellness behavior. Backend tests exercise auth, safe errors, limits, urgent safety routing, moderation failures, request privacy options, and the provider contract using injected fake fetch responses. They do not measure real model quality or device interactions.

The README stays intact. The original setup guide remains at `docs/GETTING_STARTED.md`; use this guide for Chat/backend setup.

## Implementation checks

Strict TypeScript checks passed for app and server. Automated flow/data/backend tests passed with fake provider/auth responses. SDK dependency compatibility and production Hermes exports passed for iOS and Android. Live provider/device checks remain **not verified**.

## Connection troubleshooting

| Symptom | Meaning and action |
| --- | --- |
| Configuration banner | It names the missing variable, URL shape error or conflicting public-key spelling. Use HTTPS origins and the canonical names; restart Expo with `--clear`. |
| Couldn’t reach Supabase | Check phone internet, project URL, and whether the project is paused. No backend/provider call has been made. |
| Supabase sign-in rejected | Check public key and enable Authentication → anonymous sign-ins. If CAPTCHA is enforced, use a private test project or implement the challenge; this app cannot solve an enabled challenge. Do not disable safeguards on a public production project. |
| Couldn’t save/open credentials securely | Retry or reset the secure connection; check Expo Go/SecureStore behavior on the phone. No successful chat is claimed until credentials are usable. |
| Backend rejected session | App/server Supabase projects differ, the key is incorrect, or the session is revoked. The client refreshes and resends once after a 401; persistent rejection remains an authentication error. Reset secure connection after correcting configuration. |
| Couldn’t reach backend | Check HTTPS tunnel, port 8787, server process and phone internet. Safari `/health` should return JSON. A desktop health check alone does not establish iPhone reachability. |
| Backend HTTP error / invalid reply | Tunnel points to the wrong service, a proxy blocked it, or app/server versions differ. Inspect only status/error codes, not journals or credentials. |
| Backend couldn’t reach Supabase | The server's auth endpoint is unavailable or server egress/key configuration is wrong. This is distinct from OpenAI failure. |
| OpenAI credentials rejected | Fix server-only `OPENAI_API_KEY` and model access. Never copy it into Expo. |
| OpenAI quota/rate limit | Check provider billing/usage limits and retry later. |
| OpenAI model/request rejected | Check `OPENAI_MODEL` supports the Responses API and strict structured output. |
| Provider unavailable/unusable reply | A provider/network/safety-validation failure occurred. Retry the same pending message. Raw provider error bodies are deliberately not shown or logged. |

The client caches anonymous credentials in SecureStore, refreshes near expiry, and retries a backend 401 only once. An explicitly rejected refresh credential can create a new anonymous identity; transport failures and Supabase outages preserve the old credentials. Pending chat requests and their context are reused on user retry, without duplicating local turns. Deleting or resetting during sign-in cannot save a late session or resurrect a deleted conversation. Server startup uses Node's `--use-env-proxy` to respect configured HTTPS proxies and CA trust in managed environments.

## Live verification command (real services, not fixtures)

After configuring both `.env` files, starting the backend/tunnel, and setting the app's public URL, run:

```sh
cd server
npm run verify:live
```

This creates a real anonymous Supabase session in memory, makes two authenticated requests to the configured HTTPS backend, and requires `source: ai` on both replies. It sends only fixed fictional test content and forwards the first reply as conversation context. It does not print tokens, keys, journals, or replies and exits nonzero on failure. It incurs real OpenAI usage and leaves an anonymous identity in Supabase; manage anonymous-user cleanup for your test project. A successful command verifies server-side composition with real services, **not** Expo Go, iPhone networking, SecureStore, UI behavior, or conversational quality. Complete `COMPANION_DEVICE_TEST.md` on your phone before claiming the live app works.
