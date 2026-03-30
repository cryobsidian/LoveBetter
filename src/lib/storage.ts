import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SessionSnapshot } from "../types";

const SESSION_STORAGE_KEY = "love-better/session-v1";

export async function loadStoredSession(): Promise<SessionSnapshot | null> {
  try {
    const rawValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as SessionSnapshot;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: SessionSnapshot): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
