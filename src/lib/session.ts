import { getQuestionsForPack, questionBankById } from "../data/questionBank";
import type {
  AnswerValue,
  ExploreItem,
  LatestAnswerHistory,
  PackId,
  Question,
  SavedAnswerRecord,
  SessionSnapshot,
} from "../types";

export const QUESTIONS_PER_SESSION = 12;

const exploreNudges: Record<Extract<AnswerValue, "mid" | "no">, string> = {
  mid: "There is already some awareness here. Try asking directly or noticing the pattern in real moments.",
  no: "This is a good one to explore gently. Ask about it, watch for it over time, or make space to learn together.",
};

export function createSession(packId: PackId): SessionSnapshot {
  const selectedQuestions = shuffle(getQuestionsForPack(packId)).slice(0, QUESTIONS_PER_SESSION);

  return {
    sessionState: "IN_PROGRESS",
    packId,
    questionIds: selectedQuestions.map((question) => question.id),
    answers: {},
    currentIndex: 0,
    startedAt: new Date().toISOString(),
  };
}

export function resolveSessionQuestions(session: SessionSnapshot): Question[] {
  return session.questionIds
    .map((questionId) => questionBankById.get(questionId))
    .filter((question): question is Question => Boolean(question));
}

export function answerQuestion(
  session: SessionSnapshot,
  questionId: string,
  answer: AnswerValue,
): SessionSnapshot {
  return {
    ...session,
    answers: {
      ...session.answers,
      [questionId]: answer,
    },
  };
}

export function advanceSession(session: SessionSnapshot): SessionSnapshot {
  const isFinalQuestion = session.currentIndex >= session.questionIds.length - 1;

  if (isFinalQuestion) {
    return {
      ...session,
      sessionState: "COMPLETED",
      currentIndex: session.questionIds.length - 1,
      completedAt: new Date().toISOString(),
    };
  }

  return {
    ...session,
    currentIndex: session.currentIndex + 1,
  };
}

export function summarizeAnswers(session: SessionSnapshot) {
  const counts = {
    yes: 0,
    mid: 0,
    no: 0,
  };

  Object.values(session.answers).forEach((answer) => {
    counts[answer] += 1;
  });

  return counts;
}

export function getExploreItems(session: SessionSnapshot): ExploreItem[] {
  return Object.entries(session.answers)
    .filter((entry): entry is [string, Extract<AnswerValue, "mid" | "no">] => {
      return entry[1] === "mid" || entry[1] === "no";
    })
    .map(([questionId, answer]) => {
      const question = questionBankById.get(questionId);

      if (!question) {
        return null;
      }

      return {
        question,
        answer,
        nudge: exploreNudges[answer],
      };
    })
    .filter((item): item is ExploreItem => Boolean(item));
}

export function buildLatestAnswerRecords(session: SessionSnapshot): SavedAnswerRecord[] {
  const answeredAt = session.completedAt ?? new Date().toISOString();

  return Object.entries(session.answers)
    .map(([questionId, answer]) => {
      const question = questionBankById.get(questionId);

      if (!question) {
        return null;
      }

      return {
        questionId,
        answer,
        answeredAt,
        packId: session.packId,
        questionCategory: question.category,
      };
    })
    .filter((record): record is SavedAnswerRecord => Boolean(record));
}

export function mergeLatestAnswerHistory(
  existingHistory: LatestAnswerHistory,
  nextRecords: SavedAnswerRecord[],
): LatestAnswerHistory {
  const nextHistory = { ...existingHistory };

  nextRecords.forEach((record) => {
    nextHistory[record.questionId] = record;
  });

  return nextHistory;
}

export function getSortedLatestAnswerRecords(history: LatestAnswerHistory): SavedAnswerRecord[] {
  return Object.values(history).sort((left, right) => {
    return new Date(right.answeredAt).getTime() - new Date(left.answeredAt).getTime();
  });
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[randomIndex];
    next[randomIndex] = current;
  }

  return next;
}
