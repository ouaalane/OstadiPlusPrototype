import type { AppNotification, CenterMembership } from './types';

/** Resolve old centre-only notifications as well as invitations with an explicit ID. */
export function membershipForNotification(
  memberships: readonly CenterMembership[],
  notification: AppNotification,
): CenterMembership | undefined {
  if (notification.kind !== 'center-request') return undefined;
  const own = memberships.filter(
    (m) =>
      m.studentId === notification.studentId &&
      m.centerId === notification.payload.centerId,
  );
  if (notification.payload.membershipId)
    return own.find((m) => m.id === notification.payload.membershipId);
  // A later reinvitation must not change the actions on an older notification.
  return own
    .filter((m) => m.requestedAt <= notification.createdAt)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
}
