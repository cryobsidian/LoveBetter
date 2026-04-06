import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnswerValue, LatestAnswerHistory, SessionSnapshot } from "../types";

const STORAGE_PREFIX = "love-better/";
const SESSION_STORAGE_KEY = `${STORAGE_PREFIX}session-v1`;
const LATEST_ANSWERS_STORAGE_KEY = `${STORAGE_PREFIX}latest-answers-v1`;

export async function loadStoredSession(): Promise<SessionSnapshot | null> {
  try {
    const rawValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Omit<SessionSnapshot, "packId" | "answers"> & {
      answers?: Record<string, unknown>;
      packId?: SessionSnapshot["packId"];
    };

    return {
      ...parsed,
      answers: normalizeAnswerMap(parsed.answers),
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

    const parsed = JSON.parse(rawValue) as Record<string, {
      answer?: unknown;
      answeredAt?: unknown;
      packId?: SessionSnapshot["packId"];
      questionCategory?: unknown;
      questionId?: unknown;
    }>;

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([questionId, record]) => {
        const answer = normalizeAnswerValue(record?.answer);

        if (!answer || typeof record?.answeredAt !== "string" || typeof record?.questionCategory !== "string") {
          return [];
        }

        return [[
          questionId,
          {
            questionId: typeof record.questionId === "string" ? record.questionId : questionId,
            answer,
            answeredAt: record.answeredAt,
            packId: record.packId ?? "standard",
            questionCategory: record.questionCategory as LatestAnswerHistory[string]["questionCategory"],
          },
        ]];
      }),
    );
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

function normalizeAnswerMap(answers?: Record<string, unknown>): Record<string, AnswerValue> {
  if (!answers) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(answers).flatMap(([questionId, answer]) => {
      const normalizedAnswer = normalizeAnswerValue(answer);

      return normalizedAnswer ? [[questionId, normalizedAnswer]] : [];
    }),
  );
}

function normalizeAnswerValue(answer: unknown): AnswerValue | null {
  if (answer === "yes" || answer === "no") {
    return answer;
  }

  if (answer === "mid") {
    return "no";
  }

  return null;
}
