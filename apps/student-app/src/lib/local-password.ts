import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

type CryptoClient = typeof import('expo-crypto');
// Do not crash older development binaries when their native module is absent.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cryptoClient: CryptoClient | null = Platform.OS !== 'web' && requireOptionalNativeModule('ExpoCrypto') ? require('expo-crypto') : null;
const prefix = 'ostadiplus.local-password.v1:';
const iterations = 600_000;
interface Credential { salt: string; digest: string; iterations: number }

async function derive(password: string, salt: string, rounds: number) {
  return bytesToHex(await pbkdf2Async(sha256, password, hexToBytes(salt), { c: rounds, dkLen: 32, asyncTick: 10 }));
}

export async function hasLocalPassword(studentId: string) {
  return (await AsyncStorage.getItem(prefix + studentId)) !== null;
}

export async function verifyLocalPassword(studentId: string, password: string) {
  const raw = await AsyncStorage.getItem(prefix + studentId);
  // Legacy/demo accounts have no password backend. Keep their existing demo
  // login until the owner sets a local password from the profile editor.
  if (!raw) return true;
  const stored = JSON.parse(raw) as Credential;
  if (stored.iterations !== iterations || !/^[a-f0-9]{32}$/.test(stored.salt) || !/^[a-f0-9]{64}$/.test(stored.digest)) throw new Error('INVALID_LOCAL_CREDENTIAL');
  const actual = await derive(password, stored.salt, stored.iterations);
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ stored.digest.charCodeAt(i);
  return difference === 0;
}

export async function setLocalPassword(studentId: string, password: string) {
  const bytes = Platform.OS === 'web'
    ? globalThis.crypto.getRandomValues(new Uint8Array(16))
    : cryptoClient ? await cryptoClient.getRandomBytesAsync(16) : null;
  if (!bytes) throw new Error('PASSWORD_BUILD_REQUIRED');
  const salt = bytesToHex(bytes);
  const credential: Credential = { salt, digest: await derive(password, salt, iterations), iterations };
  // Credentials stay outside the shareable teacher/student demo payload.
  await AsyncStorage.setItem(prefix + studentId, JSON.stringify(credential));
}

export async function changeLocalPassword(studentId: string, current: string, next: string) {
  if (next.length < 8) throw new Error('PASSWORD_TOO_SHORT');
  if (!(await verifyLocalPassword(studentId, current))) return false;
  await setLocalPassword(studentId, next);
  return true;
}
