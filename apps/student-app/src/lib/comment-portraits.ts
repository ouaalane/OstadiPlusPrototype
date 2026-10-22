/** Bundled demo photos, assigned consistently rather than changing on render. */
const portraits = [
  require('../../assets/people/student-01.jpg'),
  require('../../assets/people/student-02.jpg'),
  require('../../assets/people/student-03.jpg'),
  require('../../assets/people/student-04.jpg'),
] as const;

const seededPortraits = new Map<string, number>([
  ['st-iman', 0],
  ['st-yassine', 2],
]);

export function commentPortraitFor(studentId: string): number {
  const seeded = seededPortraits.get(studentId);
  if (seeded !== undefined) return portraits[seeded];
  let hash = 0;
  for (const character of studentId) hash = (Math.imul(hash, 31) + character.codePointAt(0)!) >>> 0;
  return portraits[hash % portraits.length];
}
