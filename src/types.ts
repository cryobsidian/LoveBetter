export type QuestionCategory =
  | "Daily Habits"
  | "Food & Dining Style"
  | "Fun & Random"
  | "Lifestyle & Comfort"
  | "Money & Shopping Habits"
  | "Personality and Tendencies"
  | "Preference and Taste"
  | "Relationship Awareness"
  | "Social & Leisure"
  | "Travel & Exploration";

export type SourceCategory = QuestionCategory;

export type PackId = "standard" | QuestionCategory;

export type AnswerValue = "yes" | "mid" | "no";

export type SessionState = "START" | "IN_PROGRESS" | "COMPLETED";

export type Question = {
  id: string;
  text: string;
  category: QuestionCategory;
  sourceCategory: SourceCategory;
  tier: 1;
  feedback_yes: string;
  feedback_mid: string;
  feedback_no: string;
};

export type QuestionPack = {
  id: PackId;
  label: string;
  description: string;
  category?: QuestionCategory;
};

export type SessionSnapshot = {
  sessionState: SessionState;
  packId: PackId;
  questionIds: string[];
  answers: Record<string, AnswerValue>;
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
};

export type SavedAnswerRecord = {
  questionId: string;
  answer: AnswerValue;
  answeredAt: string;
  packId: PackId;
  questionCategory: QuestionCategory;
};

export type LatestAnswerHistory = Record<string, SavedAnswerRecord>;

export type ExploreItem = {
  question: Question;
  answer: Extract<AnswerValue, "mid" | "no">;
  nudge: string;
};
