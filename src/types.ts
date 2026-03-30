export type QuestionCategory =
  | "Daily Habits"
  | "Preferences"
  | "Emotional Needs"
  | "Stress & Coping"
  | "Lifestyle";

export type SourceCategory =
  | "Daily Habits"
  | "Food & Dining Style"
  | "Fun & Random"
  | "Lifestyle & Comfort"
  | "Money & Shopping Habits"
  | "Personality and Tendencies"
  | "Preference and Taste"
  | "Relationship Awareness"
  | "Social & Leisure"
  | "Travel & Exploration"
  | "Emotional Needs"
  | "Stress & Coping";

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

export type SessionSnapshot = {
  sessionState: SessionState;
  questionIds: string[];
  answers: Record<string, AnswerValue>;
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
};

export type ExploreItem = {
  question: Question;
  answer: Extract<AnswerValue, "mid" | "no">;
  nudge: string;
};
