import type { Student } from './types';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SPACE = ALPHABET.length ** 5;

/** A readable identifier, never a password or an access grant. The previous
 * LCG emitted only its low five bits, yielding just 32 distinct codes. */
export function createStudentCode(seed: string, students: Pick<Student, 'studentCode'>[]): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
  hash ^= hash >>> 16;
  const used = new Set(students.map(s => (s.studentCode ?? '').trim().toUpperCase()));
  for (let offset = 0; offset <= used.size && offset < SPACE; offset++) {
    let value = ((hash >>> 0) + offset) % SPACE;
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix = ALPHABET[value % ALPHABET.length] + suffix;
      value = Math.floor(value / ALPHABET.length);
    }
    const code = 'UST-' + suffix;
    if (!used.has(code)) return code;
  }
  throw new Error('STUDENT_CODE_SPACE_EXHAUSTED');
}

/** Repair legacy collisions, preserving the first owner and every unique code.
 * Reserve all existing identifiers before allocating so later valid ones stay
 * untouched. IDs/enrollments/progress are never renamed. */
export function repairStudentCodes(students: Student[]): Student[] {
  const reserved = [...students];
  const seen = new Set<string>();
  return students.map(student => {
    const original = (student.studentCode ?? '').trim().toUpperCase();
    if (original && !seen.has(original)) {
      seen.add(original);
      return student;
    }
    const studentCode = createStudentCode(student.id, reserved);
    const repaired = { ...student, studentCode };
    reserved.push(repaired);
    seen.add(studentCode);
    return repaired;
  });
}
