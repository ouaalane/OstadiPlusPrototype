# Centre invitations

The mobile app and teacher dashboard now share the existing local demo server for student invitations. No extra native modules are required; the invitation inbox is usable in Expo Go.

1. Run `npm run demo`. In the dashboard’s Publish & sync page and the mobile app’s Centre sync screen, configure the same reachable server address. A physical phone needs the computer’s LAN address, not `localhost` or the emulator address. The student’s waiting screen has a shortcut to connection setup.
2. A signed-in student registers their profile with that server automatically. Their existing UST identifier remains on their card and waiting screen. The illustrated QR remains the existing demo; staff can enter the printed identifier.
3. Staff enter the student’s ID in Students or Reception and send an invitation. The identity preview is limited to name/code until acceptance. Failed sends show an error and can be retried. Duplicate sends reuse the pending invitation.
4. The student opens Notifications, including when they have no courses, and accepts or declines. Failed responses leave the invitation pending. Accepted/declined state persists on the server.
5. The centre’s student roster and reception profile update automatically after acceptance. Joining the centre does not grant courses: staff still assign the existing monthly or semester subscriptions separately.

Connection records refresh approximately every five seconds while these clients are running. These requests merge only connection/profile records; they do not replace unsaved lessons, course drafts, playback progress, or language preferences. Course publishing and other existing demo sync flows remain unchanged. Invitations identify their exact membership; accepting one does not answer other centres’ invitations. Older centre-only notifications are matched by their original request date.

This uses **in-app notifications**, not background OS push delivery. Both clients need the same running demo server and network access. This remains the repository’s unauthenticated local prototype hub, not production authentication or a production consent/privacy boundary. Production deployment needs authenticated student/centre identities and scoped data endpoints; the existing full-state demo endpoints still exist.

Validation: `npm run invitations:test` checks API lifecycle/ownership matching, duplicate requests, rejection/reinvitation, persistence, stale publishes, and the real mobile browser UI → server → dashboard journey, including network failures and retry. `npm run dashboard:test` covers dashboard regressions. Browser coverage does not substitute for physical iOS/Android testing.
