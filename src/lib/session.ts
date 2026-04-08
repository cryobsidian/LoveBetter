import { getQuestionsForPack, questionBank, questionBankById, questionCategories } from "../data/questionBank";
import type {
  AnswerValue,
  CategoryKnowledgeTracker,
  ExploreItem,
  LatestAnswerHistory,
  PackId,
  Question,
  SavedAnswerRecord,
  SessionSnapshot,
} from "../types";

export const QUESTIONS_PER_SESSION = 12;

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
    no: 0,
  };

  Object.values(session.answers).forEach((answer) => {
    counts[answer] += 1;
  });

  return counts;
}

export function getExploreItems(session: SessionSnapshot): ExploreItem[] {
  return Object.entries(session.answers)
    .filter((entry): entry is [string, "no"] => {
      return entry[1] === "no";
    })
    .map(([questionId, answer]) => {
      const question = questionBankById.get(questionId);

      if (!question) {
        return null;
      }

      return {
        question,
        answer,
        feedback: question.feedbackNo,
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

export function getCategoryKnowledgeTracker(
  history: LatestAnswerHistory,
): CategoryKnowledgeTracker[] {
  const totalCounts = questionBank.reduce<Record<string, number>>((counts, question) => {
    counts[question.category] = (counts[question.category] ?? 0) + 1;
    return counts;
  }, {});

  const yesCounts = Object.values(history).reduce<Record<string, number>>((counts, record) => {
    if (record.answer === "yes") {
      counts[record.questionCategory] = (counts[record.questionCategory] ?? 0) + 1;
    }

    return counts;
  }, {});

  return questionCategories.map((category) => {
    const totalCount = totalCounts[category] ?? 0;
    const yesCount = yesCounts[category] ?? 0;

    return {
      category,
      yesCount,
      totalCount,
      percentage: totalCount === 0 ? 0 : Math.round((yesCount / totalCount) * 100),
    };
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
