import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LatestAnswerHistory, SessionSnapshot } from "../types";

const STORAGE_PREFIX = "love-better/";
const SESSION_STORAGE_KEY = `${STORAGE_PREFIX}session-v1`;
const LATEST_ANSWERS_STORAGE_KEY = `${STORAGE_PREFIX}latest-answers-v1`;

export async function loadStoredSession(): Promise<SessionSnapshot | null> {
  try {
    const rawValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Omit<SessionSnapshot, "packId"> & {
      packId?: SessionSnapshot["packId"];
    };

    return {
      ...parsed,
      packId: parsed.packId ?? "standard",
    };
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

export async function loadLatestAnswerHistory(): Promise<LatestAnswerHistory> {
  try {
    const rawValue = await AsyncStorage.getItem(LATEST_ANSWERS_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    return JSON.parse(rawValue) as LatestAnswerHistory;
  } catch {
    return {};
  }
}

export async function saveLatestAnswerHistory(history: LatestAnswerHistory): Promise<void> {
  await AsyncStorage.setItem(LATEST_ANSWERS_STORAGE_KEY, JSON.stringify(history));
}

export async function clearAllAppStorage(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter((key) => key.startsWith(STORAGE_PREFIX));

  if (appKeys.length === 0) {
    return;
  }

  await AsyncStorage.multiRemove(appKeys);
}
