import rawQuestions from "./questions.generated.json";

import type {
  PackId,
  Question,
  QuestionCategory,
  QuestionPack,
  SourceCategory,
} from "../types";

type RawQuestion = {
  ID?: string;
  Name: string;
  "Difficulty Level": string;
  "Question Type": SourceCategory;
  "Feedback No"?: string;
};

const rawQuestionRows = rawQuestions as RawQuestion[];

export const questionCategories: QuestionCategory[] = [
  "Daily Habits",
  "Food & Dining Style",
  "Fun & Random",
  "Lifestyle & Comfort",
  "Money & Shopping Habits",
  "Personality and Tendencies",
  "Preference and Taste",
  "Relationship Awareness",
  "Social & Leisure",
  "Travel & Exploration",
];

export const questionPacks: QuestionPack[] = [
  {
    id: "standard",
    label: "Standard",
    description: "A mixed self-check across the full question bank.",
  },
  ...questionCategories.map((category) => ({
    id: category,
    label: category,
    description: `A focused self-check built from ${category.toLowerCase()} questions.`,
    category,
  })),
];

export const questionPacksById = new Map(questionPacks.map((pack) => [pack.id, pack]));

const levelOneRows = rawQuestionRows.filter((row) => row["Difficulty Level"] === "Level 1");

const generatedQuestions: Question[] = levelOneRows.map((row, index) => {
  const text = row.Name.trim();
  const category = row["Question Type"];

  return {
    id: row.ID?.trim() || buildQuestionId(index),
    text,
    category,
    sourceCategory: category,
    tier: 1,
    feedbackNo: row["Feedback No"]?.trim() || "-",
  };
});

const legacyQuestionIdAliases = new Map<string, string>(
  levelOneRows.map((row, index) => {
    const canonicalId = row.ID?.trim() || buildQuestionId(index);
    return [buildLegacyQuestionId(index, row.Name.trim()), canonicalId];
  }),
);

export const questionBank: Question[] = generatedQuestions;

export const questionBankById = new Map(questionBank.map((question) => [question.id, question]));

export function getQuestionsForPack(packId: PackId): Question[] {
  if (packId === "standard") {
    return questionBank;
  }

  return questionBank.filter((question) => question.category === packId);
}

export function getPackLabel(packId: PackId): string {
  return questionPacksById.get(packId)?.label ?? "Standard";
}

export function getPackDescription(packId: PackId): string {
  return (
    questionPacksById.get(packId)?.description ??
    "A mixed self-check across the full question bank."
  );
}

export function normalizeQuestionId(questionId: string): string {
  return legacyQuestionIdAliases.get(questionId) ?? questionId;
}

function buildQuestionId(index: number): string {
  return `t1-${index + 1}`;
}

function buildLegacyQuestionId(index: number, value: string): string {
  return ["tier1", index + 1, slugify(value)].join("-");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
