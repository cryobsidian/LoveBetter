import rawQuestions from "./questions.generated.json";

import type {
  PackId,
  Question,
  QuestionCategory,
  QuestionFeedback,
  QuestionPack,
  SourceCategory,
} from "../types";

type RawQuestion = {
  Name: string;
  "Difficulty Level": string;
  "Question Type": SourceCategory;
  "Feedback Yes"?: string;
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

const defaultQuestionFeedback: QuestionFeedback = {
  yes: "-",
  no: "-",
};

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

const generatedQuestions: Question[] = rawQuestionRows
  .filter((row) => row["Difficulty Level"] === "Level 1")
  .map((row, index) => {
    const text = row.Name.trim();
    const category = row["Question Type"];

    return {
      id: buildQuestionId(index, text),
      text,
      category,
      sourceCategory: category,
      tier: 1,
      feedback: getQuestionFeedback(row),
    };
  });

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

function buildQuestionId(index: number, value: string): string {
  return ["tier1", index + 1, slugify(value)].join("-");
}

function getQuestionFeedback(row: RawQuestion): QuestionFeedback {
  return {
    yes: row["Feedback Yes"]?.trim() || defaultQuestionFeedback.yes,
    no: row["Feedback No"]?.trim() || defaultQuestionFeedback.no,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
