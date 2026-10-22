import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { DemoState, Student } from '@ostadiplus/shared';
const KEY = 'ostadiplus.demo.endpoint';
let configured = false;
let endpoint =
  Platform.OS === 'web' ? 'http://localhost:8787' : 'http://10.0.2.2:8787';
export const demoEndpoint = () => endpoint;
export const demoApiOverride = () => (configured ? endpoint : undefined);
export const demoAssetUrl = (file: string) =>
  file.startsWith('/api/demo/') ? endpoint + file : file;
export async function loadDemoEndpoint() {
  const saved = await AsyncStorage.getItem(KEY);
  if (saved) {
    endpoint = saved;
    configured = true;
  }
  return endpoint;
}
export async function saveDemoEndpoint(value: string) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Invalid server URL');
  endpoint = url.origin;
  configured = true;
  await AsyncStorage.setItem(KEY, endpoint);
}
export async function syncStudentDemo(
  state: DemoState,
  student: Student,
): Promise<DemoState> {
  const response = await fetch(endpoint + '/api/demo/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student,
      memberships: (state.memberships ?? []).filter(
        (m) => m.studentId === student.id,
      ),
      readNotifications: (state.notifications ?? [])
        .filter((n) => n.studentId === student.id && n.read)
        .map((n) => n.id),
      progress: state.progress[student.id] ?? [],
      questions: (state.questions ?? []).filter(
        (q) => q.studentId === student.id,
      ),
      quizAttempts: (state.quizAttempts ?? []).filter(
        (a) => a.studentId === student.id,
      ),
    }),
  });
  if (!response.ok) throw new Error(`Sync failed (${response.status})`);
  const remote = await response.json();
  return { ...remote, activeStudentId: student.id, lang: state.lang };
}
