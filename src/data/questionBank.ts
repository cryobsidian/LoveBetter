import rawQuestions from "./questions.generated.json";

import type { AnswerValue, Question, QuestionCategory, SourceCategory } from "../types";

type RawQuestion = {
  Name: string;
  "Difficulty Level": string;
  "Question Type": SourceCategory;
};

const rawQuestionRows = rawQuestions as RawQuestion[];

const feedbackByCategory: Record<QuestionCategory, Record<AnswerValue, string>> = {
  "Daily Habits": {
    yes: "That kind of everyday awareness usually makes care feel more natural.",
    mid: "There may still be a few routine patterns here that are easy to miss.",
    no: "A small daily detail like this can be a simple place to get more curious.",
  },
  "Food & Dining Style": {
    yes: "Knowing food habits and cravings often shows up in thoughtful everyday choices.",
    mid: "This could be something to notice more casually over time.",
    no: "Food preferences are usually easy to explore in a low-pressure way.",
  },
  "Fun & Random": {
    yes: "Little playful details often make someone feel memorably known.",
    mid: "There is probably more texture here than you know yet.",
    no: "A light question like this can be fun to ask without making it serious.",
  },
  "Lifestyle & Comfort": {
    yes: "Comfort patterns often shape how someone feels most at ease.",
    mid: "You may know some of this already, but there is likely more to notice.",
    no: "This could become an easy conversation the next time comfort or routines come up.",
  },
  "Money & Shopping Habits": {
    yes: "Knowing practical habits like this can prevent small misunderstandings later.",
    mid: "There may be a few habits or preferences here that are still unclear.",
    no: "This is a useful area to learn gradually because it affects everyday decisions.",
  },
  "Personality and Tendencies": {
    yes: "That kind of awareness usually helps you respond to them more thoughtfully.",
    mid: "There may be nuance here that becomes clearer in real situations.",
    no: "Personality patterns are easy to assume, so this is a strong area for curiosity.",
  },
  "Preference and Taste": {
    yes: "Knowing small preferences often helps someone feel considered in ordinary moments.",
    mid: "This could be something to ask directly or notice more intentionally.",
    no: "A simple preference question like this can be easy to explore without pressure.",
  },
  "Relationship Awareness": {
    yes: "That is meaningful knowledge because it shapes how seen and supported they feel.",
    mid: "You may already know part of this, but there is probably more to learn.",
    no: "This is a good area to explore gently, since relationship needs are often easy to assume.",
  },
  "Social & Leisure": {
    yes: "Awareness like this helps you understand how they like to spend their energy.",
    mid: "There is probably more to learn here by observing or spending time together.",
    no: "This can be a natural thing to explore through conversation or shared plans.",
  },
  "Travel & Exploration": {
    yes: "Knowing how they approach travel can reveal a lot about comfort and curiosity.",
    mid: "There may still be preferences here that have not surfaced clearly yet.",
    no: "Travel questions are often an easy way to learn more without much pressure.",
  },
};

const generatedQuestions: Question[] = rawQuestionRows
  .filter((row) => row["Difficulty Level"] === "Level 1")
  .map((row, index) => {
    const category = row["Question Type"];

    return {
      id: ["tier1", index + 1, slugify(row.Name)].join("-"),
      text: row.Name.trim(),
      category,
      sourceCategory: category,
      tier: 1,
      feedback_yes: feedbackByCategory[category].yes,
      feedback_mid: feedbackByCategory[category].mid,
      feedback_no: feedbackByCategory[category].no,
    };
  });

export const questionBank: Question[] = generatedQuestions;

export const questionBankById = new Map(questionBank.map((question) => [question.id, question]));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
