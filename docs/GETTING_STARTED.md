# Run Yunomi on your phone

Yunomi is an Expo + React Native + TypeScript app for iOS and Android. This foundation includes a welcoming home, a daily mood check-in with optional notes and recent entries, and a habit tracker where you can add, remove, complete, and undo habits.

## Expo Go

1. Install Node.js 22.13+ (Node 24 recommended) and Git on your computer.
2. Install **Expo Go** from the App Store or Google Play on your phone.
3. Check out this branch (or main after the PR is merged):

   ```sh
   git clone https://github.com/suzenops/Yunomi.git
   cd Yunomi
   git checkout codex/adaptive-companion
   npm ci
   npx expo install --check
   npm start
   ```

4. Put your computer and phone on the same Wi-Fi network. Scan the terminal QR code with the iPhone Camera app or the QR scanner in Expo Go on Android. Open it in Expo Go.
5. Edit a screen in `src/screens/` and save. Expo Fast Refresh updates your phone.

Dependencies match Expo SDK 57's published template and bundled native module versions. Use a version of Expo Go that supports SDK 57. If Expo Go reports an SDK mismatch, follow Expo's [upgrade guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) and run `npx expo install --fix` and `npx expo-doctor`; don't individually upgrade React or React Native. Physical iOS devices generally need the current App Store version of Expo Go. [Expo Go downloads](https://expo.dev/go) list supported versions.

If the QR code won't connect, allow the dev server through your computer's firewall. You can also try `npx expo start --tunnel` (requires internet and may prompt to install Expo's tunnel helper). To clear a stale bundler cache, use `npx expo start --clear`.

`npm run android` opens a configured Android emulator. `npm run ios` opens the iOS simulator on macOS with Xcode installed. Neither is required to test with a physical phone and Expo Go.

## Verify the foundation

```sh
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform ios --output-dir dist/ios
npx expo export --platform android --output-dir dist/android
```

`npm test` uses Node's built-in TypeScript stripping and test runner; no test library setup is required. It covers daily date boundaries, reversible habit updates, mood edits, and stored-data validation.

On both iOS and Android, try this checklist:

- Navigate through all three tabs; home buttons should open the matching tab.
- Pick a mood, add a note, save, and verify it appears on Home and in Recent moments.
- Update today's check-in; it should replace that entry, not create a second one.
- Complete and undo a habit. Verify the home count updates.
- Add a habit; blank names are disabled and duplicate names are rejected.
- Remove a habit; cancel first, then confirm. Removing deletes its history too.
- Close and reopen the app. Saved mood and habit progress should remain.
- Check on a new calendar day: yesterday's mood stays in history, and habits start unchecked. The app refreshes the local day on foregrounding and every 30 seconds.
- Check a small screen, large system text, VoiceOver/TalkBack, Android back behavior, and text inputs with the keyboard open.

## Find your way around

- `App.tsx`: safe areas, status bar, shared state, navigation.
- `src/navigation/`: typed bottom tabs with fade transitions.
- `src/screens/`: Home, Check-in, Habits; one file per screen.
- `src/components/`: shared screen layout and button.
- `src/state/`: data loading and serialized saves; errors keep existing data intact.
- `src/utils/`: data types and pure date, mood, habit, and validation functions.
- `src/theme.ts`: colors and shared typography/layout styles.
- `tests/`: focused data behavior checks.

Data lives locally in AsyncStorage, under `@yunomi/wellness/v1`. It is not encrypted, synced, or backed up by this app. Removing Expo Go or clearing its app data can erase the journal. The optional AI companion adds a Chat tab and authenticated backend. Journal sharing requires explicit consent; see [Companion setup](COMPANION_SETUP.md) for configuration, retention, and testing. There are no analytics, Apple Health, or Android Health Connect integrations. The README's health references remain future plans.

Before a store release, add app icons/splash assets, unique bundle identifiers, privacy/data controls, and a production build configuration. This is a foundation, not a store submission.

## Validation during creation

- Dependency installation and strict TypeScript checking passed.
- All four pure data behavior tests passed.
- Expo's local dependency compatibility check passed against SDK 57.
- Production JavaScript/Hermes bundle exports passed for both iOS and Android.
- Expo Doctor passed 19/21 checks. Its app-config schema and React Native Directory checks could not reach their external services in the managed environment. Rerun `npx expo-doctor` on your computer.
- Physical-device interaction and accessibility checks still need to be performed in Expo Go using the checklist above. Bundle exports verify compilation, not device behavior.

The npm lockfile is committed for reproducible installs. Use `npm ci` for an existing checkout and `npx expo install` when adding native dependencies.
