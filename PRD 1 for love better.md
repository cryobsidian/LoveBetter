# PRD 1 for love better

# Phase 1 : Ground-breaking

#### Product Name

Love Better (MVP 1)

#### One-line Positioning

A lightweight self-check game for people in relationships to reflect on how well they know their partner.

#### Primary User

People currently in relationships.

#### Core Promise

Users finish a short session with clearer awareness of what they do and do not know about their partner, along with a few prompts to explore later.

#### Experience Tone

Playful, safe, curious, and non-judgmental.

#### Core Product Principles

- No shaming or grading the relationship
- Reflection before advice
- Short, easy-to-start sessions
- Curiosity-driven follow-up, not pressure

#### MVP Boundaries / Non-goals

- Not a therapy product
- Not a compatibility score
- Not a partner-sync or multiplayer experience
- Not a coaching system that tells users how to fix their relationship

#### Desired User Outcome

"I now know a few things I'm unsure about, and I have natural ways to learn them."

# Phase 2 : Problems and Solutions

#### Core problem

People in relationships often do not know each other as well as they assume, which can later show up as feeling unseen, misunderstood, or not appreciated by their partner.

## Target audience

| Audience | Struggles | Opportunities |
| --- | --- | --- |
| People in relationships | They may assume they know their partner well, but still miss everyday preferences, emotional needs, or stress patterns. | A lightweight self-check can reveal blind spots early and encourage more intentional connection. |

#### Problem statements:

- People in relationships often overestimate how well they know their partner in everyday life.
- Small knowledge gaps can turn into bigger feelings of disconnection when left unnoticed.

<aside>
We believe people in relationships experience hidden knowledge gaps in everyday moments, causing missed opportunities for care and connection, and they currently cope by assuming they will figure things out naturally over time.
</aside>

How does our solution solve/help the problem?

- It helps users quickly notice what they do and do not know about their partner.
- It turns uncertainty into low-pressure prompts for further discovery through conversation, observation, or more intentional time together.

<aside>
Outcome thinking: users leave the session with sharper awareness, not a judgment score.
</aside>

# Phase 3 : Development

## Wing A Functional requirements

### A1 : Self-Check Quiz Mode

### Description

A guided sequence of reflective questions for a solo self-check experience.

### Question Format

- Prompt: "Do you know X about your partner?"
- Answer options:
    - Yes
    - Not really
    - No

### Feedback System

Each answer triggers a response:

| Answer | Feedback Type |
| --- | --- |
| Yes | Reinforcement |
| Not really | Neutral curiosity |
| No | Suggestion/opportunity |

### A2

### Structure

Each question contains:

- `id`
- `text`
- `category`
- `tier` (MVP = Tier 1 only)
- `feedback_yes`
- `feedback_mid`
- `feedback_no`

### Categories (MVP)

- Daily Habits
- Preferences
- Emotional Needs
- Stress & Coping
- Lifestyle

### A3 Session System

#### Rules

- 10-15 questions per session
- Questions randomly selected from pool
- No repetition within session

#### Completion Flow Rules

- The session result is not a score or grade.
- The summary should surface questions answered with `Not really` or `No`.
- These questions should be framed as "things to explore" rather than failures.
- Follow-up should encourage flexible discovery: ask directly, notice over time, or spend more intentional time together.

#### Session States

- `START`
- `IN_PROGRESS`
- `COMPLETED`

## Wing B Non functional requirements

## Wing C Gameplay Loop

- User opens app
- Starts a solo self-check session
- Answers 10-15 self-check questions
- Receives light feedback after each answer
- Completes session and sees a review-oriented summary with things to explore
- Option to replay

# Phase 4 : Tech

## Frontend

- Framework: **React Native (Expo)**
- Platforms:
    - iOS
    - Android
    - Web (via Expo Web)

## Backend

- **Firebase**
    - Firestore (question storage)
    - Optional: Cloud Functions (future logic)
    - Optional: Auth (post-MVP)

## Data Storage (MVP)

- Questions: stored in Firestore or local JSON
- Session progress: local state (AsyncStorage)

# Phase 5 : Flow

## Screens

### 1. Home Screen

- Title
- "Start" button

---

### 2. Mode Intro Screen

- Brief explanation:
    
    > "This is a quick self-check. No right or wrong answers - just curiosity."

---

### 3. Question Screen

- Question text
- 3 answer buttons
- Progress indicator

---

### 4. Feedback (Inline or Modal)

- Short message based on answer
- "Next" button

---

### 5. Summary Screen

- Completion message
- Answer breakdown
- Review list of questions answered with `Not really` or `No`
- "Things to explore" framing for uncertain answers
- No numeric score or relationship grade
- Replay button

# Phase 5 : Evaluation

## Success Criteria (MVP)

### Qualitative

- Users say:
    - "That was actually interesting"
    - "I didn't think about that before"
    - The app helped them notice something they want to ask, observe, or learn about their partner

### Quantitative

- >=70% session completion rate
- >=30% replay rate

# Phase 6 : Future Planning

- QR sharing mode (Host profile challenge)
- Partner sync mode
- Deeper question tiers
- Streaks / retention systems
- Monetized question packs
