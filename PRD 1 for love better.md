# PRD 1 for love better

# Phase 1 : Ground-breaking

#### Product Name

Love Better (MVP 1)

#### Core Identity

A **fun, lightweight self-check game** that helps users reflect on how well they know their partner

# Phase 2 : Problems and Solutions

#### Core problem

People in relationships do not know each other enough leading to problems later on in the relationship such as feeling not appreciated by their partners 

## Target audience

| Audience | Struggles | Opportunities |
| --- | --- | --- |
| People in relationships |  |  |
| People trying to get into relationships |  |  |

#### Problem statements:

- Statement 1
- Statement 2

<aside>
👧🏼 “We believe [specific user] experiences [specific pain] during [specific moment], causing [specific loss], and they currently cope by [existing workaround]

</aside>

How does our solution solve/help the problem? 

- Solution 1
- Solution 2

<aside>
👧🏼

outcome thinking 

</aside>

# Phase 3 : Development

## Wing A Functional requirements

### A1 : Self-Check Quiz Mode

### Description

A guided sequence of reflective questions.

### Question Format

- Prompt: “Do you know X about your partner?”
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

- 10–15 questions per session
- Questions randomly selected from pool
- No repetition within session

#### Session States

- `START`
- `IN_PROGRESS`
- `COMPLETED`

## Wing B Non functional requirements

## Wing C Gameplay Loop

- User opens app
- Starts a session
- Answers 10–15 self-check questions
- Receives light feedback after each answer
- Completes session → sees summary
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
- “Start” button

---

### 2. Mode Intro Screen

- Brief explanation:
    
    > “This is a quick self-check. No right or wrong answers — just curiosity.”
    > 

---

### 3. Question Screen

- Question text
- 3 answer buttons
- Progress indicator

---

### 4. Feedback (Inline or Modal)

- Short message based on answer
- “Next” button

---

### 5. Summary Screen

- Completion message
- Answer breakdown
- Replay button

# Phase 5 : Evaluation

## Success Criteria (MVP)

### Qualitative

- Users say:
    - “That was actually interesting”
    - “I didn’t think about that before”

### Quantitative

- ≥70% session completion rate
- ≥30% replay rate

# Phase 6 : Future Planning

- QR sharing mode (Host profile challenge)
- Partner sync mode
- Deeper question tiers
- Streaks / retention systems
- Monetized question packs