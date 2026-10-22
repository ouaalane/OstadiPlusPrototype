# Preview in Expo Go

“My profile” now opens the profile editor: name, email, phone, optional age,
education level/status, and optional password change. Cancel leaves those fields
unchanged. Saving preserves the student ID, QR, photo, courses and progress.
Education choices are shared with signup; an existing detailed level stays available.

Passwords remain local prototype credentials, not server authentication. New
signups store a salted PBKDF2-SHA256 verifier (600,000 rounds) in a separate local
storage key, outside shareable demo data. Login checks it; replacing it requires
the current password. Legacy/demo accounts can set their first password without
inventing a current one. Guest demos and the simulated verification-code flow
remain available. Existing custom binaries need rebuilding for `expo-crypto`;
SDK 57 Expo Go includes it. Run `npm ci --prefix apps/student-app` after updating.

```sh
node --test apps/student-app/scripts/test-profile-details.cjs apps/student-app/scripts/test-local-password.cjs
```

Profile photos are optional during signup and can be replaced by tapping the
profile avatar/camera badge. The system image picker selects one photo; a square
JPEG thumbnail of at most 512 × 512 is stored locally with that student, so it
survives cache cleanup and app restarts. Cancellation leaves the old photo intact.
Install the updated native dependencies before starting Metro:

```sh
npm ci --prefix apps/student-app
npm run start --prefix apps/student-app -- --go --clear
```

Use SDK 57-compatible Expo Go. Existing custom binaries need rebuilding to include
`expo-image-picker` and `expo-image-manipulator`; older binaries skip their native
imports safely and explain the required update when the photo button is tapped.

“Continue as guest” opens a picker with two existing demo students with active
courses, so presentations retain the populated dashboard, lessons and progress.
It does not create an empty student or include newly registered accounts.
Signup creates an independent local prototype student who opens an empty
welcome screen with their own code and centre instructions;
courses appear only after that student's access is activated in the demo data.
Login resolves the entered email/phone and never falls back to another pupil.
The QR illustration is a placeholder, not a scannable encoder; registration,
verification and centre activation are still local demo flows, without an auth
backend. Check account matching with:

```sh
node --test apps/student-app/scripts/test-student-login.cjs
```

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
