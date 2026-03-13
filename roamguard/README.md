# RoamGuard — Expo App 🌍

Auto-reply SMS when abroad or out of coverage. Built with **Expo SDK 55**, no backend APIs — everything runs on-device.

---

## Quick Start

```bash
# 1. Delete node_modules and reinstall clean
rm -rf node_modules
npm install

# 2. Start on Android (Expo Go)
npx expo start --android

# 3. For full call detection (requires native build):
npx expo prebuild
npx expo run:android
```

---

## What was fixed (from SDK 51 → 55)

| Problem | Fix |
|---|---|
| `expo-sms` listed in `plugins` → PluginError | Removed — expo-sms needs no config plugin |
| `expo-notifications` icon path missing | Removed — not needed for core features |
| `expo-background-fetch` deprecated | Removed — replaced by `expo-task-manager` |
| `expo-av` deprecated | Removed — not needed |
| Inline `require()` in `_layout.tsx` | Fixed — proper ES imports |
| SDK 51 package versions | Upgraded to SDK 55 compatible versions |

---

## Project Structure

```
RoamGuardExpo/
├── app/
│   ├── _layout.tsx          # Tab navigation
│   ├── index.tsx            # Home — toggle, status, activity log
│   ├── settings.tsx         # Trigger mode, message editor, toggles
│   └── howto.tsx            # Flow diagram, permissions, iOS guide
├── src/
│   ├── constants/theme.ts   # Colors, spacing
│   ├── services/
│   │   ├── storage.ts       # AsyncStorage — no backend
│   │   ├── networkService.ts# expo-cellular + expo-network
│   │   └── smsService.ts    # expo-sms with dedupe + logging
│   └── hooks/
│       └── useCallDetection.ts
├── modules/RoamGuardModule/ # Kotlin native module for call detection
├── app.json                 # Expo config (no broken plugins)
└── package.json             # SDK 55 versions
```

---

## Packages Used (no backend)

| Package | Purpose |
|---|---|
| `expo-cellular` | `isRoamingAsync()` — detect foreign SIM |
| `expo-network` | `getNetworkStateAsync()` — detect no coverage |
| `expo-sms` | `sendSMSAsync()` — send SMS on-device |
| `expo-contacts` | Skip known contacts (optional) |
| `expo-router` | Tab navigation |
| `@react-native-async-storage/async-storage` | All settings stored locally |

---

## Native Module (call detection on Android)

After `expo prebuild`, place `modules/RoamGuardModule/RoamGuardModule.kt` in:
`android/app/src/main/java/expo/modules/roamguard/`

Then register in `MainApplication.kt` — see `modules/RoamGuardModule/index.ts` for full instructions.

---

## iOS Notes

Apple blocks silent background SMS. Use a **Siri Shortcut** automation instead — see the "How it works" tab in the app for step-by-step setup.
