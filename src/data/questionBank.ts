import rawQuestions from "./questions.generated.json";

import type { AnswerValue, Question, QuestionCategory, SourceCategory } from "../types";

type RawQuestion = {
  Name: string;
  "Difficulty Level": string;
  "Question Type": Exclude<SourceCategory, "Emotional Needs" | "Stress & Coping">;
};

const rawQuestionRows = rawQuestions as RawQuestion[];

const categoryMap: Record<Exclude<SourceCategory, "Emotional Needs" | "Stress & Coping">, QuestionCategory> = {
  "Daily Habits": "Daily Habits",
  "Food & Dining Style": "Preferences",
  "Fun & Random": "Lifestyle",
  "Lifestyle & Comfort": "Lifestyle",
  "Money & Shopping Habits": "Lifestyle",
  "Personality and Tendencies": "Emotional Needs",
  "Preference and Taste": "Preferences",
  "Relationship Awareness": "Emotional Needs",
  "Social & Leisure": "Lifestyle",
  "Travel & Exploration": "Lifestyle",
};

const feedbackByCategory: Record<QuestionCategory, Record<AnswerValue, string>> = {
  "Daily Habits": {
    yes: "That kind of everyday awareness usually makes care feel more natural.",
    mid: "There may be a few routines here that are still easy to miss.",
    no: "A small day-to-day detail like this can be a gentle place to get more curious.",
  },
  Preferences: {
    yes: "Knowing small preferences often helps someone feel considered in ordinary moments.",
    mid: "This could be something to notice over time or ask about casually.",
    no: "A simple preference question like this can be easy to explore without pressure.",
  },
  "Emotional Needs": {
    yes: "That is a meaningful kind of knowledge because it shapes how supported they feel.",
    mid: "There may be more nuance here than you have had space to notice yet.",
    no: "This is a good area to explore gently, since emotional needs are often easy to assume.",
  },
  "Stress & Coping": {
    yes: "Awareness like this can make stressful moments feel less lonely for both of you.",
    mid: "You may already know part of this, but there is probably more to learn in context.",
    no: "Stress patterns are worth learning slowly because they matter most when things feel hard.",
  },
  Lifestyle: {
    yes: "That kind of broader context helps you understand how they move through life.",
    mid: "There is probably a little more texture here to notice together.",
    no: "This could become an easy conversation starter the next time it comes up naturally.",
  },
};

const manualQuestions: Question[] = [
  createManualQuestion(
    "Do you know what usually helps them feel emotionally safe after a hard day?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know how they most like to be comforted when they feel overwhelmed?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what kind of reassurance matters most to them?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what makes them feel especially appreciated in the relationship?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know how they usually show they need support without saying it directly?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what kind of check-in helps them open up when something feels off?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what kind of conflict repair feels most reassuring to them?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what helps them feel seen when they have had a draining week?",
    "Emotional Needs",
    "Emotional Needs",
  ),
  createManualQuestion(
    "Do you know what their earliest signs of stress usually look like?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know whether they prefer space or company when they are stressed?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know what tends to calm them down fastest after a tense moment?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know what usually makes their stress worse without meaning to?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know how they tend to act when they are close to burnout?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know what kind of support feels helpful to them during a busy week?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know whether they like to talk through stress right away or later on?",
    "Stress & Coping",
    "Stress & Coping",
  ),
  createManualQuestion(
    "Do you know how they usually recover after a socially or emotionally heavy day?",
    "Stress & Coping",
    "Stress & Coping",
  ),
];

const generatedQuestions: Question[] = rawQuestionRows
  .filter((row) => row["Difficulty Level"] === "Level 1")
  .map((row, index) => {
    const sourceCategory = row["Question Type"];
    const category = categoryMap[sourceCategory];

    return {
      id: ["tier1", index + 1, slugify(row.Name)].join("-"),
      text: row.Name.trim(),
      category,
      sourceCategory,
      tier: 1,
      feedback_yes: feedbackByCategory[category].yes,
      feedback_mid: feedbackByCategory[category].mid,
      feedback_no: feedbackByCategory[category].no,
    };
  });

export const questionBank: Question[] = [...generatedQuestions, ...manualQuestions];

export const questionBankById = new Map(questionBank.map((question) => [question.id, question]));

function createManualQuestion(
  text: string,
  category: QuestionCategory,
  sourceCategory: Extract<SourceCategory, "Emotional Needs" | "Stress & Coping">,
): Question {
  return {
    id: `manual-${slugify(text)}`,
    text,
    category,
    sourceCategory,
    tier: 1,
    feedback_yes: feedbackByCategory[category].yes,
    feedback_mid: feedbackByCategory[category].mid,
    feedback_no: feedbackByCategory[category].no,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


