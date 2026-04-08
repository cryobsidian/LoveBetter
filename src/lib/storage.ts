import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeQuestionId } from "../data/questionBank";
import type {
  AnswerValue,
  HistoricalNoHistory,
  LatestAnswerHistory,
  SessionSnapshot,
} from "../types";

const STORAGE_PREFIX = "love-better/";
const SESSION_STORAGE_KEY = `${STORAGE_PREFIX}session-v1`;
const LATEST_ANSWERS_STORAGE_KEY = `${STORAGE_PREFIX}latest-answers-v1`;
const HISTORICAL_NO_STORAGE_KEY = `${STORAGE_PREFIX}historical-no-v1`;

export async function loadStoredSession(): Promise<SessionSnapshot | null> {
  try {
    const rawValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Omit<SessionSnapshot, "packId" | "answers" | "questionIds"> & {
      answers?: Record<string, unknown>;
      packId?: SessionSnapshot["packId"];
      questionIds?: unknown;
    };

    return {
      ...parsed,
      answers: normalizeAnswerMap(parsed.answers),
      packId: parsed.packId ?? "standard",
      questionIds: normalizeQuestionIds(parsed.questionIds),
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
        const normalizedQuestionId = normalizeQuestionId(questionId);

        if (!answer || typeof record?.answeredAt !== "string" || typeof record?.questionCategory !== "string") {
          return [];
        }

        return [[
          normalizedQuestionId,
          {
            questionId:
              typeof record.questionId === "string"
                ? normalizeQuestionId(record.questionId)
                : normalizedQuestionId,
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

export async function loadHistoricalNoHistory(): Promise<HistoricalNoHistory> {
  try {
    const rawValue = await AsyncStorage.getItem(HISTORICAL_NO_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as Record<string, {
      answeredAt?: unknown;
      questionId?: unknown;
    }>;

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([questionId, record]) => {
        const normalizedQuestionId = normalizeQuestionId(questionId);

        if (typeof record?.answeredAt !== "string") {
          return [];
        }

        return [[
          normalizedQuestionId,
          {
            questionId:
              typeof record.questionId === "string"
                ? normalizeQuestionId(record.questionId)
                : normalizedQuestionId,
            answeredAt: record.answeredAt,
          },
        ]];
      }),
    );
  } catch {
    return {};
  }
}

export async function saveHistoricalNoHistory(history: HistoricalNoHistory): Promise<void> {
  await AsyncStorage.setItem(HISTORICAL_NO_STORAGE_KEY, JSON.stringify(history));
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
      const normalizedQuestionId = normalizeQuestionId(questionId);

      return normalizedAnswer ? [[normalizedQuestionId, normalizedAnswer]] : [];
    }),
  );
}

function normalizeQuestionIds(questionIds: unknown): string[] {
  if (!Array.isArray(questionIds)) {
    return [];
  }

  return questionIds
    .filter((questionId): questionId is string => typeof questionId === "string")
    .map((questionId) => normalizeQuestionId(questionId));
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
