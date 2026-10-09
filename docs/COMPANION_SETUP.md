# Yunomi's adaptive companion

## Current status

This PR implements the app flow and authenticated backend. **Live AI is not verified.** The creation environment has no OpenAI or Supabase credentials and no attached iOS/Android device. Automated tests use fake provider/auth responses, never synthetic responses presented as live AI. Passing bundle exports does not verify a conversation on a phone.

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

Restart Metro after environment changes:

```sh
npx expo start --clear
```

Install Expo Go supporting SDK 57 on iOS or Android. Put your phone and computer on the same Wi-Fi and scan the QR code with Camera on iOS or Expo Go on Android. If the Metro connection is blocked, use `npx expo start --tunnel`; the backend still needs its own reachable HTTPS endpoint.

### Required live acceptance checklist

Use fictional, non-sensitive entries during testing. Record platform, device, date, backend deployment, model, and outcome in `docs/COMPANION_DEVICE_TEST.md`. Do not include private conversations or credentials.

1. Without app config, Chat shows **AI connection not configured**. Home, Check-in, and Habits still work.
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
