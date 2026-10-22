# Preview in Expo Go

Video screens now allow the phone's automatic rotation and expand the same
player to fill a landscape window, keeping its controls and watermark. Leaving
the video restores portrait. Enable system auto-rotate when testing on Android.
Install updated dependencies with `npm ci --prefix apps/student-app` first.
Older installed development/production apps need a new native build for
`expo-screen-orientation` and the updated supported orientations. A missing
orientation module is skipped safely; rotation is unavailable in that binary.

Use an Expo Go version compatible with this project's Expo SDK 57. From the
repository root:

```sh
npm run start --prefix apps/student-app -- --go --clear
```

Close the old Expo Go session and reopen the project after clearing Metro's cache.
For a phone on a different network, use Expo's tunnel mode:

```sh
npm run start --prefix apps/student-app -- --go --clear --tunnel
```

The Android Expo Go binary lacks `ExpoTopicSubscriptionModule`. All notification
consumers use `src/notifications/client.ts`, which avoids evaluating
`expo-notifications` in Android Expo Go and in web previews. The app's own lesson
inbox/demo records remain available, but native notification permission prompts,
delivery, and tap listeners are skipped there. Profile reports notifications as
disabled and explains that a development/installed build is needed when tapped.

Development/production builds and iOS keep the native notification implementation.
The guard does not conceal missing modules in a mismatched development build.
Custom launcher icons and native splash settings also need a native build; Expo
Go cannot demonstrate those installed-app assets.

Regression check, from the repository root:

```sh
node --test apps/student-app/scripts/test-expo-go-notifications.cjs
```

The tests check that the native entry point is never evaluated in Android Expo Go,
that supported runtimes retain it, that unsupported alert calls are safe, that
development builds retain permission/delivery behavior, and that no other app
source bypasses the guarded client. Runtime branching is tested with simulated
hosts; a physical Expo Go session is not available in this cloud environment.
