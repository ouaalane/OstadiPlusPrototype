import type { Student } from '@ostadiplus/shared';

export type ProfileDetails = Pick<Student, 'fullName' | 'email' | 'phone' | 'level' | 'studentType' | 'age'>;

export function latinDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function profileErrors(details: ProfileDetails, students: Student[], studentId: string) {
  const errors: Record<string, string> = {};
  if (!details.fullName.trim()) errors.fullName = 'name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) errors.email = 'email';
  else if (students.some(student => student.id !== studentId && student.email.trim().toLowerCase() === details.email.trim().toLowerCase())) errors.email = 'duplicate';
  const phone = latinDigits(details.phone.trim());
  if (phone && !/^\+?[\d\s()-]+$/.test(phone)) errors.phone = 'phone';
  else if (phone && (phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) errors.phone = 'phone';
  if (!details.level.trim()) errors.level = 'level';
  if (details.age !== undefined && (!Number.isInteger(details.age) || details.age < 1 || details.age > 120)) errors.age = 'age';
  return errors;
}

export function applyProfileDetails(student: Student, details: ProfileDetails): Student {
  const fullName = details.fullName.trim();
  return { ...student, fullName, email: details.email.trim(), phone: latinDigits(details.phone.trim()), level: details.level,
    age: details.age, studentType: details.studentType,
    monogram: fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('') || student.monogram };
}
