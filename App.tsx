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
  getPackDescription,
  getPackLabel,
  questionBankById,
  questionPacks,
} from "./src/data/questionBank";
import {
  QUESTIONS_PER_SESSION,
  advanceSession,
  answerQuestion,
  buildLatestAnswerRecords,
  createSession,
  getExploreItems,
  getSortedLatestAnswerRecords,
  mergeLatestAnswerHistory,
  resolveSessionQuestions,
  summarizeAnswers,
} from "./src/lib/session";
import {
  clearAllAppStorage,
  clearStoredSession,
  loadLatestAnswerHistory,
  loadStoredSession,
  saveLatestAnswerHistory,
  saveStoredSession,
} from "./src/lib/storage";
import type {
  AnswerValue,
  LatestAnswerHistory,
  PackId,
  Question,
  QuestionPack,
  SavedAnswerRecord,
  SessionSnapshot,
} from "./src/types";

type Screen = "home" | "intro" | "question" | "summary" | "dashboard";

type DashboardItem = {
  record: SavedAnswerRecord;
  question: Question;
};

const answerOptions: { value: AnswerValue; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "mid", label: "Not really" },
  { value: "no", label: "No" },
];

const theme = {
  background: ["#fff6e9", "#ffe4d4", "#f9f0d7"] as const,
  cream: "#fff1df",
  card: "rgba(255, 250, 243, 0.92)",
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
  const [latestAnswerHistory, setLatestAnswerHistory] = useState<LatestAnswerHistory>({});
  const [selectedPackId, setSelectedPackId] = useState<PackId | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);

  useEffect(() => {
    void hydrateAppState();
  }, []);

  const sessionQuestions = useMemo(() => {
    return session ? resolveSessionQuestions(session) : [];
  }, [session]);

  const dashboardItems = useMemo<DashboardItem[]>(() => {
    return getSortedLatestAnswerRecords(latestAnswerHistory)
      .map((record) => {
        const question = questionBankById.get(record.questionId);

        if (!question) {
          return null;
        }

        return { record, question };
      })
      .filter((item): item is DashboardItem => Boolean(item));
  }, [latestAnswerHistory]);

  const currentQuestion = session
    ? sessionQuestions[session.currentIndex] ?? sessionQuestions[0]
    : null;
  const selectedAnswer = currentQuestion ? session?.answers[currentQuestion.id] : undefined;
  const answerSummary = session ? summarizeAnswers(session) : null;
  const exploreItems = session ? getExploreItems(session) : [];
  const answeredCount = session ? Object.keys(session.answers).length : 0;
  const progressRatio = session ? answeredCount / session.questionIds.length : 0;
  const selectedPack = selectedPackId ? questionPacks.find((pack) => pack.id === selectedPackId) ?? null : null;

  async function hydrateAppState() {
    const [storedSession, storedLatestAnswers] = await Promise.all([
      loadStoredSession(),
      loadLatestAnswerHistory(),
    ]);

    setLatestAnswerHistory(storedLatestAnswers);

    if (!storedSession) {
      setIsHydrating(false);
      return;
    }

    setSession(storedSession);
    setSelectedPackId(storedSession.packId);
    setScreen(storedSession.sessionState === "COMPLETED" ? "summary" : "question");
    setIsHydrating(false);
  }

  function beginPackIntro(packId: PackId) {
    if (session?.sessionState === "IN_PROGRESS") {
      return;
    }

    setSelectedPackId(packId);
    setScreen("intro");
  }

  async function beginSession() {
    const packId = selectedPackId ?? "standard";
    const nextSession = createSession(packId);

    setSession(nextSession);
    setScreen("question");
    await saveStoredSession(nextSession);
  }

  async function handleAnswer(answer: AnswerValue) {
    if (!session || !currentQuestion) {
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
      const nextHistory = mergeLatestAnswerHistory(
        latestAnswerHistory,
        buildLatestAnswerRecords(nextSession),
      );

      setLatestAnswerHistory(nextHistory);
      setScreen("summary");
      await Promise.all([
        saveStoredSession(nextSession),
        saveLatestAnswerHistory(nextHistory),
      ]);
      return;
    }

    await saveStoredSession(nextSession);
  }

  async function handleReplay() {
    const nextPackId = session?.packId ?? selectedPackId ?? "standard";

    setSession(null);
    setSelectedPackId(nextPackId);
    setScreen("intro");
    await clearStoredSession();
  }

  async function handleResetToHome() {
    setSession(null);
    setSelectedPackId(null);
    setIsConfirmingClearData(false);
    setScreen("home");
    await clearStoredSession();
  }

  function openDashboard() {
    setIsConfirmingClearData(false);
    setScreen("dashboard");
  }

  function navigateHome() {
    setSelectedPackId(null);
    setIsConfirmingClearData(false);
    setScreen("home");
  }

  async function handleConfirmClearData() {
    setSession(null);
    setSelectedPackId(null);
    setLatestAnswerHistory({});
    setIsConfirmingClearData(false);
    setScreen("home");
    await clearAllAppStorage();
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
              activePackLabel={session ? getPackLabel(session.packId) : undefined}
              lastCompletedAt={session?.completedAt}
              packs={questionPacks}
              onOpenDashboard={openDashboard}
              onResume={() => setScreen("question")}
              onSelectPack={beginPackIntro}
            />
          ) : null}

          {screen === "intro" && selectedPack ? (
            <IntroScreen
              pack={selectedPack}
              onBack={handleResetToHome}
              onStart={beginSession}
            />
          ) : null}

          {screen === "question" && session && currentQuestion ? (
            <QuestionScreen
              answeredCount={answeredCount}
              currentQuestion={currentQuestion}
              onAnswer={handleAnswer}
              onNext={handleNext}
              packLabel={getPackLabel(session.packId)}
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
              packLabel={getPackLabel(session.packId)}
            />
          ) : null}

          {screen === "dashboard" ? (
            <DashboardScreen
              items={dashboardItems}
              isConfirmingClearData={isConfirmingClearData}
              onBack={navigateHome}
              onCancelClearData={() => setIsConfirmingClearData(false)}
              onConfirmClearData={handleConfirmClearData}
              onRequestClearData={() => setIsConfirmingClearData(true)}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
function HomeScreen(props: {
  hasInProgressSession: boolean;
  activePackLabel?: string;
  lastCompletedAt?: string;
  packs: QuestionPack[];
  onOpenDashboard: () => void;
  onResume: () => void;
  onSelectPack: (packId: PackId) => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.heroTag}>
        <Text style={styles.heroTagText}>Love Better v1.01</Text>
      </View>

      <Text style={styles.displayTitle}>Choose a self-check mode and start exploring what you know.</Text>
      <Text style={styles.heroBody}>
        Play a mixed round or focus on one pack at a time. Everything stays local to this device, and your latest completed answers appear in the dashboard.
      </Text>

      <View style={styles.heroStats}>
        <MetricCard value={`${QUESTIONS_PER_SESSION}`} label="prompts" />
        <MetricCard value="10" label="category packs" />
        <MetricCard value="local" label="storage" />
      </View>

      <View style={styles.rowActions}>
        {props.hasInProgressSession ? (
          <Pressable style={styles.primaryButton} onPress={props.onResume}>
            <Text style={styles.primaryButtonText}>Resume {props.activePackLabel ?? "Standard"}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryButton} onPress={props.onOpenDashboard}>
          <Text style={styles.secondaryButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      {props.hasInProgressSession ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Current session saved</Text>
          <Text style={styles.noticeBody}>
            Resume the in-progress session before starting another pack. If you want a complete reset, use Clear Data from the dashboard.
          </Text>
        </View>
      ) : null}

      <View style={styles.packGrid}>
        {props.packs.map((pack) => {
          const isStandard = pack.id === "standard";

          return (
            <Pressable
              key={pack.id}
              disabled={props.hasInProgressSession}
              style={[
                styles.packCard,
                isStandard ? styles.packCardPrimary : null,
                props.hasInProgressSession ? styles.packCardDisabled : null,
              ]}
              onPress={() => props.onSelectPack(pack.id)}
            >
              <View style={styles.packCardHeader}>
                <Text style={[styles.packCardTitle, isStandard ? styles.packCardTitlePrimary : null]}>
                  {pack.label}
                </Text>
                {isStandard ? <Text style={styles.packBadge}>Recommended</Text> : null}
              </View>
              <Text style={[styles.packCardBody, isStandard ? styles.packCardBodyPrimary : null]}>
                {pack.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.supportText}>
        {props.lastCompletedAt
          ? `Last completed session saved ${formatDate(props.lastCompletedAt)}.`
          : "Pick any mode to begin a new self-check."}
      </Text>
    </View>
  );
}

function IntroScreen(props: { pack: QuestionPack; onBack: () => void; onStart: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Before you begin</Text>
      <Text style={styles.sectionTitle}>{props.pack.label} self-check</Text>
      <Text style={styles.sectionBody}>
        {getPackDescription(props.pack.id)} There is still no grade here, just a short reflection to help you notice what feels clear and what deserves more curiosity.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.cardBody}>You will answer up to 12 prompts with Yes, Not really, or No.</Text>
        <Text style={styles.cardBody}>You can revise an answer before moving to the next prompt.</Text>
        <Text style={styles.cardBody}>When you finish, the summary highlights things to explore and the dashboard saves your latest completed answers.</Text>
      </View>

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryButton} onPress={props.onBack}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.primaryButtonCompact} onPress={props.onStart}>
          <Text style={styles.primaryButtonText}>Start {props.pack.label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionScreen(props: {
  answeredCount: number;
  currentQuestion: Question;
  onAnswer: (answer: AnswerValue) => void;
  onNext: () => void;
  packLabel: string;
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

      <Text style={styles.packMeta}>Mode: {props.packLabel}</Text>

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
          <Pressable style={styles.primaryButtonCompact} onPress={props.onNext}>
            <Text style={styles.primaryButtonText}>
              {props.answeredCount >= props.totalCount ? "See summary" : "Next prompt"}
            </Text>
          </Pressable>
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
  packLabel: string;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Session complete</Text>
      <Text style={styles.sectionTitle}>You now have a clearer sense of what feels known and what deserves more curiosity.</Text>
      <View style={styles.summaryMetaRow}>
        <Text style={styles.categoryChip}>{props.packLabel}</Text>
        <Text style={styles.supportText}>
          {props.completedAt ? `Completed ${formatDate(props.completedAt)}` : "Completed just now"}
        </Text>
      </View>
      <Text style={styles.sectionBody}>
        No relationship grade is hiding here, just a snapshot to help future conversations feel more natural.
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
                <Text style={styles.exploreAnswer}>{formatAnswer(item.answer)}</Text>
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

function DashboardScreen(props: {
  items: DashboardItem[];
  isConfirmingClearData: boolean;
  onBack: () => void;
  onCancelClearData: () => void;
  onConfirmClearData: () => void;
  onRequestClearData: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Dashboard</Text>
      <Text style={styles.sectionTitle}>Your latest completed answers, saved per question.</Text>
      <Text style={styles.sectionBody}>
        If you answer the same question again in a later session, this dashboard keeps only the newest result.
      </Text>

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryButton} onPress={props.onBack}>
          <Text style={styles.secondaryButtonText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved answers</Text>
        {props.items.length === 0 ? (
          <Text style={styles.emptyState}>
            No completed answers saved yet. Finish a session and your latest answers will appear here.
          </Text>
        ) : (
          props.items.map((item) => (
            <View key={item.question.id} style={styles.dashboardRow}>
              <View style={styles.dashboardHeader}>
                <Text style={styles.dashboardCategory}>{item.record.questionCategory}</Text>
                <Text style={styles.dashboardDate}>{formatDate(item.record.answeredAt)}</Text>
              </View>
              <Text style={styles.dashboardQuestion}>{item.question.text}</Text>
              <View style={styles.dashboardMetaRow}>
                <Text style={styles.dashboardAnswer}>{formatAnswer(item.record.answer)}</Text>
                <Text style={styles.dashboardPack}>{getPackLabel(item.record.packId)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.cardDanger}>
        <Text style={styles.cardTitle}>Clear data</Text>
        <Text style={styles.cardBody}>
          This erases the saved session and every answer in the dashboard on this device.
        </Text>

        {props.isConfirmingClearData ? (
          <View style={styles.confirmationStack}>
            <Text style={styles.confirmationText}>
              Confirming will permanently reset the app to a fresh start.
            </Text>
            <View style={styles.rowActions}>
              <Pressable style={styles.secondaryButton} onPress={props.onCancelClearData}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dangerButton} onPress={props.onConfirmClearData}>
                <Text style={styles.primaryButtonText}>Yes, clear all data</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.dangerButton} onPress={props.onRequestClearData}>
            <Text style={styles.primaryButtonText}>Clear Data</Text>
          </Pressable>
        )}
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAnswer(answer: AnswerValue) {
  if (answer === "mid") {
    return "Not really";
  }

  return answer === "yes" ? "Yes" : "No";
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
    maxWidth: 920,
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
    maxWidth: 720,
  },
  heroBody: {
    color: theme.mutedInk,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 700,
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
  dangerButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.coral,
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
    maxWidth: 760,
  },
  card: {
    backgroundColor: "rgba(255, 250, 243, 0.9)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 22,
    gap: 12,
    ...webShadow,
  },
  cardDanger: {
    backgroundColor: "rgba(255, 240, 233, 0.92)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(221, 93, 67, 0.18)",
    padding: 22,
    gap: 12,
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
  noticeCard: {
    backgroundColor: "rgba(255, 250, 243, 0.9)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 18,
    gap: 8,
  },
  noticeTitle: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  noticeBody: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
  packGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  packCard: {
    flexBasis: 260,
    flexGrow: 1,
    minHeight: 138,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    padding: 20,
    gap: 12,
    ...webShadow,
  },
  packCardPrimary: {
    backgroundColor: "#342724",
    borderColor: "#342724",
  },
  packCardDisabled: {
    opacity: 0.45,
  },
  packCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  packCardTitle: {
    color: theme.ink,
    fontSize: 21,
    fontWeight: "900",
    flexShrink: 1,
  },
  packCardTitlePrimary: {
    color: "#fff7f1",
  },
  packBadge: {
    color: theme.ink,
    backgroundColor: "#f8dccd",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    overflow: "hidden",
  },
  packCardBody: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
  packCardBodyPrimary: {
    color: "#f6d8cc",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  packMeta: {
    color: theme.mutedInk,
    fontSize: 15,
    fontWeight: "600",
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
    backgroundColor: theme.card,
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
  summaryMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
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
  dashboardRow: {
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 16,
    gap: 8,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  dashboardCategory: {
    color: theme.coral,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dashboardDate: {
    color: theme.mutedInk,
    fontSize: 13,
    fontWeight: "700",
  },
  dashboardQuestion: {
    color: theme.ink,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "800",
  },
  dashboardMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  dashboardAnswer: {
    color: "#fff7f1",
    backgroundColor: theme.ink,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: "800",
  },
  dashboardPack: {
    color: theme.mintDeep,
    backgroundColor: "rgba(183, 219, 201, 0.38)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: "800",
  },
  confirmationStack: {
    gap: 12,
  },
  confirmationText: {
    color: theme.ink,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
  },
});
