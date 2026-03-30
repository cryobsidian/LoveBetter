import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

import {
  QUESTIONS_PER_SESSION,
  advanceSession,
  answerQuestion,
  createSession,
  getExploreItems,
  resolveSessionQuestions,
  summarizeAnswers,
} from "./src/lib/session";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "./src/lib/storage";
import type { AnswerValue, Question, SessionSnapshot } from "./src/types";

type Screen = "home" | "intro" | "question" | "summary";

const answerOptions: { value: AnswerValue; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "mid", label: "Not really" },
  { value: "no", label: "No" },
];

const theme = {
  background: ["#fff6e9", "#ffe4d4", "#f9f0d7"] as const,
  cream: "#fff1df",
  ink: "#31231f",
  mutedInk: "#6f5b52",
  mintDeep: "#476e63",
  coral: "#dd5d43",
  line: "rgba(49, 35, 31, 0.11)",
};

const webShadow =
  Platform.OS === "web"
    ? {
        boxShadow: "0 20px 60px rgba(91, 47, 30, 0.12)",
      }
    : {};

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    void hydrateSession();
  }, []);

  const sessionQuestions = useMemo(() => {
    return session ? resolveSessionQuestions(session) : [];
  }, [session]);

  const currentQuestion = session
    ? sessionQuestions[session.currentIndex] ?? sessionQuestions[0]
    : null;
  const selectedAnswer = currentQuestion ? session?.answers[currentQuestion.id] : undefined;
  const feedbackMessage = getFeedbackMessage(currentQuestion, selectedAnswer);
  const answerSummary = session ? summarizeAnswers(session) : null;
  const exploreItems = session ? getExploreItems(session) : [];
  const answeredCount = session ? Object.keys(session.answers).length : 0;
  const progressRatio = session ? answeredCount / session.questionIds.length : 0;

  async function hydrateSession() {
    const storedSession = await loadStoredSession();

    if (!storedSession) {
      setIsHydrating(false);
      return;
    }

    setSession(storedSession);
    setScreen(storedSession.sessionState === "COMPLETED" ? "summary" : "question");
    setIsHydrating(false);
  }

  function beginIntro() {
    setScreen("intro");
  }

  async function beginSession() {
    const nextSession = createSession();
    setSession(nextSession);
    setScreen("question");
    await saveStoredSession(nextSession);
  }

  async function handleAnswer(answer: AnswerValue) {
    if (!session || !currentQuestion || selectedAnswer) {
      return;
    }

    const nextSession = answerQuestion(session, currentQuestion.id, answer);
    setSession(nextSession);
    await saveStoredSession(nextSession);
  }

  async function handleNext() {
    if (!session || !currentQuestion || !selectedAnswer) {
      return;
    }

    const nextSession = advanceSession(session);
    setSession(nextSession);

    if (nextSession.sessionState === "COMPLETED") {
      setScreen("summary");
    }

    await saveStoredSession(nextSession);
  }

  async function handleReplay() {
    setSession(null);
    setScreen("intro");
    await clearStoredSession();
  }

  async function handleResetToHome() {
    setSession(null);
    setScreen("home");
    await clearStoredSession();
  }

  if (isHydrating) {
    return (
      <LinearGradient colors={theme.background} style={styles.flex}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="dark" />
          <View style={styles.loadingShell}>
            <ActivityIndicator size="large" color={theme.ink} />
            <Text style={styles.loadingTitle}>Loading your reflection...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.background} style={styles.flex}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <DecorativeBackdrop />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {screen === "home" ? (
            <HomeScreen
              hasInProgressSession={session?.sessionState === "IN_PROGRESS"}
              lastCompletedAt={session?.completedAt}
              onPrimaryAction={session?.sessionState === "IN_PROGRESS" ? () => setScreen("question") : beginIntro}
            />
          ) : null}

          {screen === "intro" ? (
            <IntroScreen onBack={handleResetToHome} onStart={beginSession} />
          ) : null}

          {screen === "question" && session && currentQuestion ? (
            <QuestionScreen
              answeredCount={answeredCount}
              currentQuestion={currentQuestion}
              feedbackMessage={feedbackMessage}
              onAnswer={handleAnswer}
              onNext={handleNext}
              progressRatio={progressRatio}
              selectedAnswer={selectedAnswer}
              totalCount={session.questionIds.length}
            />
          ) : null}

          {screen === "summary" && session && answerSummary ? (
            <SummaryScreen
              answerSummary={answerSummary}
              completedAt={session.completedAt}
              exploreItems={exploreItems}
              onReplay={handleReplay}
              onStartFresh={handleResetToHome}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function HomeScreen(props: {
  hasInProgressSession: boolean;
  lastCompletedAt?: string;
  onPrimaryAction: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.heroTag}>
        <Text style={styles.heroTagText}>Love Better MVP</Text>
      </View>

      <Text style={styles.displayTitle}>A playful self-check for how well you know your partner.</Text>
      <Text style={styles.heroBody}>
        No score. No shaming. Just a short reflection that helps you notice what feels clear and what could be worth exploring together.
      </Text>

      <View style={styles.heroStats}>
        <MetricCard value={`${QUESTIONS_PER_SESSION}`} label="prompts" />
        <MetricCard value="5" label="MVP themes" />
        <MetricCard value="0" label="judgment" />
      </View>

      <Pressable style={styles.primaryButton} onPress={props.onPrimaryAction}>
        <Text style={styles.primaryButtonText}>
          {props.hasInProgressSession ? "Resume session" : "Start self-check"}
        </Text>
      </Pressable>

      <Text style={styles.supportText}>
        {props.lastCompletedAt
          ? `Last reflection saved ${formatDate(props.lastCompletedAt)}.`
          : "Your progress is saved locally on this device."}
      </Text>
    </View>
  );
}

function IntroScreen(props: { onBack: () => void; onStart: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Before you begin</Text>
      <Text style={styles.sectionTitle}>This is a quick self-check, not a relationship grade.</Text>
      <Text style={styles.sectionBody}>
        Some prompts will feel easy. Others may reveal small blind spots. That is the point. The goal is to leave with a few natural things to ask, notice, or learn over time.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.cardBody}>You will answer 12 prompts about your partner with Yes, Not really, or No.</Text>
        <Text style={styles.cardBody}>After each answer, you will get a short reflection and move on when you are ready.</Text>
        <Text style={styles.cardBody}>At the end, you will see a review-oriented summary of things to explore.</Text>
      </View>

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryButton} onPress={props.onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.primaryButtonCompact} onPress={props.onStart}>
          <Text style={styles.primaryButtonText}>Let's begin</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionScreen(props: {
  answeredCount: number;
  currentQuestion: Question;
  feedbackMessage: string;
  onAnswer: (answer: AnswerValue) => void;
  onNext: () => void;
  progressRatio: number;
  selectedAnswer?: AnswerValue;
  totalCount: number;
}) {
  const promptNumber = Math.min(props.answeredCount + (props.selectedAnswer ? 0 : 1), props.totalCount);

  return (
    <View style={styles.screen}>
      <View style={styles.progressHeader}>
        <Text style={styles.eyebrow}>
          Prompt {promptNumber} of {props.totalCount}
        </Text>
        <Text style={styles.categoryChip}>{props.currentQuestion.category}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(props.progressRatio * 100, 8)}%` }]} />
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{props.currentQuestion.text}</Text>

        <View style={styles.answerStack}>
          {answerOptions.map((option) => {
            const isSelected = props.selectedAnswer === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.answerButton, isSelected ? styles.answerButtonSelected : null]}
                onPress={() => props.onAnswer(option.value)}
              >
                <Text style={[styles.answerLabel, isSelected ? styles.answerLabelSelected : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {props.selectedAnswer ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Reflection</Text>
            <Text style={styles.feedbackBody}>{props.feedbackMessage}</Text>
            <Pressable style={styles.primaryButtonCompact} onPress={props.onNext}>
              <Text style={styles.primaryButtonText}>
                {props.answeredCount >= props.totalCount ? "See summary" : "Next prompt"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SummaryScreen(props: {
  answerSummary: { yes: number; mid: number; no: number };
  completedAt?: string;
  exploreItems: ReturnType<typeof getExploreItems>;
  onReplay: () => void;
  onStartFresh: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Session complete</Text>
      <Text style={styles.sectionTitle}>You now have a clearer sense of what feels known and what deserves more curiosity.</Text>
      <Text style={styles.sectionBody}>
        {props.completedAt ? `Wrapped up ${formatDate(props.completedAt)}.` : "You finished your reflection."} No relationship grade is hiding here, just a snapshot for better conversations.
      </Text>

      <View style={styles.summaryGrid}>
        <SummaryCard title="Confident" value={props.answerSummary.yes} tone="warm" />
        <SummaryCard title="Partly known" value={props.answerSummary.mid} tone="soft" />
        <SummaryCard title="Still open" value={props.answerSummary.no} tone="light" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Things to explore</Text>
        <Text style={styles.cardBody}>
          Start with what feels easy: ask directly, notice patterns over time, or make room for more intentional time together.
        </Text>

        {props.exploreItems.length === 0 ? (
          <Text style={styles.emptyState}>
            Nothing landed in the unsure bucket this time. That does not mean you know everything, only that this set felt clear today.
          </Text>
        ) : (
          props.exploreItems.map((item) => (
            <View key={item.question.id} style={styles.exploreRow}>
              <View style={styles.exploreHeader}>
                <Text style={styles.exploreCategory}>{item.question.category}</Text>
                <Text style={styles.exploreAnswer}>{item.answer === "mid" ? "Not really" : "No"}</Text>
              </View>
              <Text style={styles.explorePrompt}>{item.question.text}</Text>
              <Text style={styles.exploreNudge}>{item.nudge}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryButton} onPress={props.onStartFresh}>
          <Text style={styles.secondaryButtonText}>Home</Text>
        </Pressable>
        <Pressable style={styles.primaryButtonCompact} onPress={props.onReplay}>
          <Text style={styles.primaryButtonText}>Replay</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DecorativeBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdropLayer}>
      <View style={[styles.orb, styles.orbPeach]} />
      <View style={[styles.orb, styles.orbMint]} />
      <View style={[styles.ribbon, styles.ribbonLeft]} />
      <View style={[styles.ribbon, styles.ribbonRight]} />
    </View>
  );
}

function MetricCard(props: { value: string; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{props.value}</Text>
      <Text style={styles.metricLabel}>{props.label}</Text>
    </View>
  );
}

function SummaryCard(props: { title: string; value: number; tone: "warm" | "soft" | "light" }) {
  const toneStyle =
    props.tone === "warm"
      ? styles.summaryToneWarm
      : props.tone === "soft"
        ? styles.summaryToneSoft
        : styles.summaryToneLight;

  return (
    <View style={[styles.summaryCard, toneStyle]}>
      <Text style={styles.summaryValue}>{props.value}</Text>
      <Text style={styles.summaryLabel}>{props.title}</Text>
    </View>
  );
}

function getFeedbackMessage(question: Question | null, answer?: AnswerValue) {
  if (!question || !answer) {
    return "";
  }

  if (answer === "yes") {
    return question.feedback_yes;
  }

  if (answer === "mid") {
    return question.feedback_mid;
  }

  return question.feedback_no;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight : 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  screen: {
    gap: 20,
    marginHorizontal: "auto",
    maxWidth: 760,
    width: "100%",
    zIndex: 1,
  },
  loadingShell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingTitle: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.44,
  },
  orbPeach: {
    width: 280,
    height: 280,
    backgroundColor: "#ffb58e",
    top: -60,
    right: -70,
  },
  orbMint: {
    width: 220,
    height: 220,
    backgroundColor: "#b7dbc9",
    bottom: 90,
    left: -60,
  },
  ribbon: {
    position: "absolute",
    height: 220,
    width: 110,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    transform: [{ rotate: "22deg" }],
  },
  ribbonLeft: {
    top: 210,
    left: 10,
  },
  ribbonRight: {
    top: 30,
    right: 160,
  },
  heroTag: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255, 250, 243, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.line,
  },
  heroTagText: {
    color: theme.coral,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  displayTitle: {
    color: theme.ink,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900",
    letterSpacing: -1.2,
    maxWidth: 680,
  },
  heroBody: {
    color: theme.mutedInk,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 620,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    minWidth: 116,
    borderRadius: 28,
    backgroundColor: "rgba(255, 250, 243, 0.88)",
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 18,
    paddingVertical: 18,
    ...webShadow,
  },
  metricValue: {
    color: theme.ink,
    fontSize: 30,
    fontWeight: "900",
  },
  metricLabel: {
    color: theme.mutedInk,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.ink,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  primaryButtonCompact: {
    alignSelf: "flex-start",
    backgroundColor: theme.ink,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "#fff7f1",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 250, 243, 0.88)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  supportText: {
    color: theme.mutedInk,
    fontSize: 14,
    lineHeight: 22,
  },
  eyebrow: {
    color: theme.coral,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: theme.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  sectionBody: {
    color: theme.mutedInk,
    fontSize: 17,
    lineHeight: 28,
    maxWidth: 720,
  },
  card: {
    backgroundColor: "rgba(255, 250, 243, 0.9)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 22,
    gap: 10,
    ...webShadow,
  },
  cardTitle: {
    color: theme.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  cardBody: {
    color: theme.mutedInk,
    fontSize: 16,
    lineHeight: 24,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  categoryChip: {
    color: theme.mintDeep,
    backgroundColor: "rgba(183, 219, 201, 0.55)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "800",
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255, 250, 243, 0.7)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.line,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.coral,
  },
  questionCard: {
    backgroundColor: "rgba(255, 250, 243, 0.92)",
    borderRadius: 34,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 24,
    gap: 20,
    ...webShadow,
  },
  questionText: {
    color: theme.ink,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  answerStack: {
    gap: 12,
  },
  answerButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: "#fffdf9",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  answerButtonSelected: {
    backgroundColor: "#342724",
    borderColor: "#342724",
  },
  answerLabel: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  answerLabelSelected: {
    color: "#fff7f1",
  },
  feedbackCard: {
    backgroundColor: theme.cream,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(221, 93, 67, 0.14)",
  },
  feedbackTitle: {
    color: theme.coral,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  feedbackBody: {
    color: theme.ink,
    fontSize: 16,
    lineHeight: 25,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 150,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 26,
    borderWidth: 1,
  },
  summaryToneWarm: {
    backgroundColor: "rgba(255, 227, 211, 0.9)",
    borderColor: "rgba(244, 140, 108, 0.3)",
  },
  summaryToneSoft: {
    backgroundColor: "rgba(255, 245, 220, 0.9)",
    borderColor: "rgba(221, 93, 67, 0.16)",
  },
  summaryToneLight: {
    backgroundColor: "rgba(233, 245, 238, 0.96)",
    borderColor: "rgba(71, 110, 99, 0.18)",
  },
  summaryValue: {
    color: theme.ink,
    fontSize: 34,
    fontWeight: "900",
  },
  summaryLabel: {
    color: theme.mutedInk,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyState: {
    color: theme.mintDeep,
    fontSize: 15,
    lineHeight: 24,
    backgroundColor: "rgba(183, 219, 201, 0.32)",
    borderRadius: 20,
    padding: 16,
  },
  exploreRow: {
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 16,
    gap: 8,
  },
  exploreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  exploreCategory: {
    color: theme.coral,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  exploreAnswer: {
    color: theme.mintDeep,
    fontSize: 13,
    fontWeight: "800",
  },
  explorePrompt: {
    color: theme.ink,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "800",
  },
  exploreNudge: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
});
