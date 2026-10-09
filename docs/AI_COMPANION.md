# Yunomi companion: setup and validation

This extends the existing Expo app; Home, Check-in and Habits continue using the same local wellness storage. Chat is a fourth tab. After saving a check-in, **Talk to Yunomi** previews only that saved entry. Nothing is sent until the user agrees to chat sharing and explicitly taps **Share this check-in with OpenAI**. A normal message does not attach journal history.

## Backend (Node 24+)

The dependency-free backend uses OpenAI moderation and Chat Completions. It will not start without a server key and personal-token hashes. No AI key belongs in Expo configuration, app source, mobile storage, QR codes, or the PR.

1. `npm ci` in the repository root.
2. Copy `server/.env.example` to `server/.env`. Add an OpenAI API key as `YUNOMI_OPENAI_API_KEY` using your server's secret manager for deployed environments. The `.env` file is ignored. The model defaults to `gpt-4.1-mini` and can be changed with `YUNOMI_MODEL`.
3. Issue a unique personal token for each tester through a secure channel. Generate at least 32 random bytes; store only its SHA-256 hex hash in `YUNOMI_ACCESS_TOKEN_HASHES` (comma-separated for several users). This command prints a new **personal token**, then its hash: run privately, not in shared logs:

   ```sh
   node -e 'const c=require("node:crypto");const t=c.randomBytes(32).toString("base64url");console.log(t);console.log(c.createHash("sha256").update(t).digest("hex"))'
   ```

4. `npm run backend`. The default bind is `127.0.0.1:3000`. Use `HOST=0.0.0.0` only when a hosting platform's private ingress requires it.
5. Put the backend behind a trusted HTTPS reverse proxy or HTTPS hosting service. Configure ingress for a 128 KB maximum request body, request timeouts, and abuse limits. Do not expose a plaintext backend port publicly. Disable request/response-body and Authorization-header logging in the hosting platform, reverse proxy, APM, and error reporting. Outbound HTTPS to `api.openai.com` is required. Node's `--use-env-proxy` supports managed proxy environments and preserves certificate verification; retain configured CA trust.
6. Check `GET /health`: it reports `configured`, which means configuration exists, **not that an AI conversation works**. Then perform the device test below.

Each personal token grants access only to stateless inference, not another person's conversation or journal. Requests have hash-based authentication, per-token limits (20 attempts/minute), a global maximum of eight concurrent requests, body/history bounds, and provider timeouts. Revoke a token by removing its hash and restarting the service. Limits are per process; use shared rate limiting at ingress before scaling replicas or public distribution. For a consumer launch, replace manual tester-token provisioning with your account provider's short-lived user sessions, add credential lifecycle handling, and independently review privacy, safety, and deployment settings.

## App (iOS and Android)

1. Copy `.env.example` to `.env`; set **only** `EXPO_PUBLIC_YUNOMI_API_URL` to the HTTPS backend origin. This URL is public. Never set `EXPO_PUBLIC_OPENAI_API_KEY` or put an access token in a public variable.
2. `npm start` and open the app with an SDK 57-compatible Expo Go on your phone. Restart Metro after changing `.env`.
3. In Chat, expand **Memory & connection settings**, enter the personal backend access token, and save it. It is kept in Expo SecureStore (not AsyncStorage). Never enter the OpenAI key there.
4. Read the disclosure and enable chat consent. Choose a conversation path or leave **Go with the flow** selected. Send a message.

### Data retention and controls

- Existing mood entries/habits remain in `@yunomi/wellness/v1` AsyncStorage; that foundation storage is not encrypted. This feature never enumerates or transmits historical journal entries.
- Conversation history exists only in app process memory; no transcript storage, analytics, server database, or automatic memory summarization is added. A maximum of 19 exchanges is supported before starting a new conversation.
- Delete conversation clears transcript, queued retry and pending check-in, and aborts in-flight work. Late responses cannot restore deleted content. It leaves the wellness journal and optional memory intact. Turning chat consent off also clears the conversation.
- Optional memory is off by default. **Load my saved memory** retrieves a previously saved note, if any. Only the text the user writes (max 500 characters) is stored under `yunomi.memory` in SecureStore and shared while enabled. An edited enabled note is used immediately; Save retains it across process restarts. Turning it off deletes the stored note and clears the current conversation so prior context is not resent. No journal or chat text is copied into memory automatically.
- SecureStore uses platform protected storage. OS backup/keychain behavior can differ; iOS keychain items may survive uninstall. Use the in-app forget/disconnect controls rather than relying on uninstall. Device backups may retain data; app deletion cannot erase backups.
- The backend keeps content only transiently for a request and does not log it. OpenAI requests set `store:false`; under standard API policy, provider abuse-monitoring data may be retained for up to 30 days. That flag does not mean zero retention. Review [OpenAI's API data controls](https://platform.openai.com/docs/guides/your-data) and your provider account's actual terms before deployment. Deleting in the app cannot retract requests or erase provider-held records. Update the in-app disclosure if deployment adds logging/storage or changes providers.
- Consent is an app interaction, not evidence of a production legal/privacy review. The stateless server rejects missing chat consent and separately rejects a supplied journal without `journalConsent:true`.

### Safety and conversation behavior

The server controls the personality prompt. Modes influence conversation direction, not mood-to-personality assignment. Replies should acknowledge real details, listen before advising, offer modest celebrations, avoid diagnosis, and ask at most one relevant question. The moderation step routes flagged self-harm intent/instructions to calm immediate-support language. Other urgent safety concerns are handled by the model's safety instructions and the always-visible real-world support message. Moderation and prompting do not guarantee safety; evaluate varied language, indirect statements, multilingual inputs, and false positives before release. Yunomi cannot monitor users, diagnose, or contact emergency services.

## Automated validation

```sh
npm ci
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo install --check
npx expo export --platform ios --max-workers 2 --output-dir dist/ios
npx expo export --platform android --max-workers 2 --output-dir dist/android
```

Tests cover the real conversation controller and memory helpers, consent gates, two-way history, optional sharing, retry without duplication, deletion/late-response races, failed storage operations, backend auth/input bounds/rate limiting, provider failure, privacy payloads, and crisis routing. HTTP tests use a local server and a stubbed model response. They verify integration and data handling, **not real model behavior**. The original wellness tests remain unchanged.

In a cloud machine with restricted home writes, use `npm_config_cache=/tmp/yunomi-npm-cache`, `EXPO_NO_TELEMETRY=1`, and `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/yunomi-expo` on Expo commands. This redirects local CLI cache only; do not set it in the app `.env`. Offline exports validate bundles without reaching Expo's external services.

## Required real-device acceptance (not yet performed here)

Do not describe the AI as working until a configured backend and a real model conversation have passed on a device. Record OS/device, backend/model, date, and redacted results without private journal text or tokens.

On iOS **and** Android:

- Recheck all original Home, Check-in and Habits actions and persistence.
- Save a mood with a note. Talk to Yunomi should preview that exact saved entry. Dismiss it: no provider request should occur. Without consent, send/share remain disabled.
- Enable chat consent and explicitly share a fictional journal entry. Verify a real response acknowledges its details. Send a follow-up; verify two-way context. No other journal entries should be in the request.
- Use each path; try the same mood with different wording/needs. Check warm short replies, one relevant follow-up, no automatic advice in Listen, realistic collaborative planning, restrained achievement celebration, and no diagnosis.
- Try fictional urgent-risk scenarios; verify empathetic real-world support, appropriate location-aware emergency guidance, and no harmful instructions. Do not use real crisis content as test data.
- Disconnect network or use an invalid token: see loading, error and retry. Retry must not duplicate the user turn. Delete while a reply is pending; it must never reappear.
- Enable/edit/save/load memory, restart the app, forget it, and inspect subsequent payloads: no forgotten note or old conversation should be resent. A failed secure-storage delete must not claim success.
- Delete a chat: journal and habits remain. Disconnect removes access credentials. Fully terminate/reopen: transcripts are gone, and consent must be given again.
- Check small screens, system font scaling, keyboard behavior, VoiceOver/TalkBack, switch/button labels, tab navigation, and Android back behavior. Bundle export alone does not validate these interactions.

Current limitation: no model credential, deployed HTTPS backend, or physical-device session is available in this cloud environment. Automated/stubbed tests must not be presented as a real AI/device test.
