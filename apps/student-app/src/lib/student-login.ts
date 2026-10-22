import type { Student } from '@ostadiplus/shared';

function phoneKey(value: string) {
  return value.replace(/\D/g, '').replace(/^(?:00212|212)/, '').replace(/^0/, '');
}

/** Resolve only the local prototype account entered, never another pupil. */
export function studentForLogin(students: Student[], identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return undefined;
  return students.find(student =>
    (student.email.trim() && student.email.trim().toLowerCase() === value) ||
    (!value.includes('@') && student.phone.trim() && phoneKey(value) && phoneKey(student.phone) === phoneKey(value)),
  );
}
