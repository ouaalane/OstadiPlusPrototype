import type { Student } from '@ostadiplus/shared';
import { profileErrors, type ProfileDetails } from './profile-details';

/** Signup and the profile editor must accept the same contact details. */
export function registrationErrors(
  details: ProfileDetails & { password: string },
  students: Student[],
) {
  const { fullName, ...errors } = profileErrors(details, students, '');
  const result: Record<string, string> = {
    ...errors,
    ...(fullName ? { name: fullName } : {}),
  };
  if (details.password.length < 8) result.password = 'password';
  return result;
}
