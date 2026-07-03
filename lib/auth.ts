import { cookies } from 'next/headers';
import users from '@/data/users.json';
import type { Role } from './types';

export const SESSION_COOKIE = 'fbl_session';

export interface SessionUser {
  username: string;
  role: Role;
}

export function findUser(username: string, password: string): SessionUser | null {
  const match = users.find((u) => u.username === username && u.password === password);
  if (!match) return null;
  return { username: match.username, role: match.role as Role };
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
