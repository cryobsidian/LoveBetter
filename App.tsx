import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import Svg, { Circle } from "react-native-svg";

import {
  getPackDescription,
  getPackLabel,
  questionPacks,
} from "./src/data/questionBank";
import {
  QUESTIONS_PER_SESSION,
  advanceSession,
  answerQuestion,
  buildHistoricalNoRecords,
  buildLatestAnswerRecords,
  createSession,
  getCategoryKnowledgeTracker,
  getDashboardNoCardItems,
  getExploreItems,
  mergeHistoricalNoHistory,
  mergeLatestAnswerHistory,
  resolveSessionQuestions,
  summarizeAnswers,
} from "./src/lib/session";
import {
  clearAllAppStorage,
  clearStoredSession,
  loadHistoricalNoHistory,
  loadLatestAnswerHistory,
  loadStoredSession,
  saveHistoricalNoHistory,
  saveLatestAnswerHistory,
  saveStoredSession,
} from "./src/lib/storage";
import type {
  AnswerValue,
  CategoryKnowledgeTracker,
  DashboardNoCardItem,
  HistoricalNoHistory,
  LatestAnswerHistory,
  PackId,
  Question,
  QuestionPack,
  SessionSnapshot,
} from "./src/types";

type Screen = "landing" | "home" | "intro" | "question" | "summary" | "dashboard";

const answerOptions: { value: AnswerValue; label: string }[] = [
  { value: "yes", label: "Yes" },
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

const webHoverGlow =
  Platform.OS === "web"
    ? {
        boxShadow: "0 28px 84px rgba(74, 46, 38, 0.3)",
      }
    : {};

const webHoverGlowPrimary =
  Platform.OS === "web"
    ? {
        boxShadow: "0 30px 88px rgba(34, 24, 22, 0.4)",
      }
    : {};

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [latestAnswerHistory, setLatestAnswerHistory] = useState<LatestAnswerHistory>({});
  const [historicalNoHistory, setHistoricalNoHistory] = useState<HistoricalNoHistory>({});
  const [selectedPackId, setSelectedPackId] = useState<PackId | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);
  const [selectedNoCardId, setSelectedNoCardId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateAppState();
  }, []);

  const sessionQuestions = useMemo(() => {
    return session ? resolveSessionQuestions(session) : [];
  }, [session]);

  const dashboardTracker = useMemo<CategoryKnowledgeTracker[]>(() => {
    return getCategoryKnowledgeTracker(latestAnswerHistory);
  }, [latestAnswerHistory]);

  const dashboardNoCards = useMemo<DashboardNoCardItem[]>(() => {
    return getDashboardNoCardItems(historicalNoHistory);
  }, [historicalNoHistory]);

  const selectedNoCard = useMemo<DashboardNoCardItem | null>(() => {
    if (!selectedNoCardId) {
      return null;
    }

    return dashboardNoCards.find((item) => item.question.id === selectedNoCardId) ?? null;
  }, [dashboardNoCards, selectedNoCardId]);

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
    const [storedSession, storedLatestAnswers, storedHistoricalNo] = await Promise.all([
      loadStoredSession(),
      loadLatestAnswerHistory(),
      loadHistoricalNoHistory(),
    ]);

    setLatestAnswerHistory(storedLatestAnswers);
    setHistoricalNoHistory(storedHistoricalNo);

    if (!storedSession) {
      setIsHydrating(false);
      return;
    }

    setSession(storedSession);
    setSelectedPackId(storedSession.packId);
    setIsHydrating(false);
  }

  async function startStandardQuizFromLanding() {
    setIsConfirmingClearData(false);
    setSelectedNoCardId(null);

    if (session?.sessionState === "IN_PROGRESS") {
      setScreen("question");
      return;
    }

    const nextSession = createSession("standard");
    setSelectedPackId("standard");
    setSession(nextSession);
    setScreen("question");
    await saveStoredSession(nextSession);
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
      const nextHistoricalNoHistory = mergeHistoricalNoHistory(
        historicalNoHistory,
        buildHistoricalNoRecords(nextSession),
      );

      setLatestAnswerHistory(nextHistory);
      setHistoricalNoHistory(nextHistoricalNoHistory);
      setScreen("summary");
      await Promise.all([
        saveStoredSession(nextSession),
        saveLatestAnswerHistory(nextHistory),
        saveHistoricalNoHistory(nextHistoricalNoHistory),
      ]);
      return;
    }

    await saveStoredSession(nextSession);
  }

  async function handleReplay() {
    const nextPackId = session?.packId ?? selectedPackId ?? "standard";

    setSession(null);
    setSelectedNoCardId(null);
    setSelectedPackId(nextPackId);
    setScreen("intro");
    await clearStoredSession();
  }

  async function handleResetToHome() {
    setSession(null);
    setSelectedPackId(null);
    setSelectedNoCardId(null);
    setIsConfirmingClearData(false);
    setScreen("home");
    await clearStoredSession();
  }

  function openDashboard() {
    setIsConfirmingClearData(false);
    setSelectedNoCardId(null);
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
    setHistoricalNoHistory({});
    setSelectedNoCardId(null);
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
          {screen === "landing" ? (
            <LandingScreen
              hasInProgressSession={session?.sessionState === "IN_PROGRESS"}
              onStartQuiz={() => void startStandardQuizFromLanding()}
            />
          ) : null}

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
              trackerRows={dashboardTracker}
              noCardItems={dashboardNoCards}
              selectedNoCard={selectedNoCard}
              isConfirmingClearData={isConfirmingClearData}
              onBack={navigateHome}
              onCancelClearData={() => setIsConfirmingClearData(false)}
              onConfirmClearData={handleConfirmClearData}
              onOpenNoCard={(questionId) => setSelectedNoCardId(questionId)}
              onCloseNoCard={() => setSelectedNoCardId(null)}
              onRequestClearData={() => setIsConfirmingClearData(true)}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function LandingScreen(props: { hasInProgressSession: boolean; onStartQuiz: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.landingHero}>
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>For Newer Couples</Text>
        </View>

        <Text style={styles.landingDisplayTitle}>Do you actually know your partner as well as you think?</Text>
        <Text style={styles.heroBody}>
          Love Better is a short, private self-check for newer or early-stage couples who want to catch blind spots early. It is not therapy, not a compatibility test, and not a relationship score.
        </Text>

        <View style={styles.rowActions}>
          <Pressable style={styles.primaryButton} onPress={props.onStartQuiz}>
            <Text style={styles.primaryButtonText}>
              {props.hasInProgressSession ? "Resume your quiz" : "Start the quiz now"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.supportText}>
          No sign-up pressure. No public sharing. Just a quick reflection you can act on right away.
        </Text>
      </View>

      <View style={styles.landingSectionCard}>
        <Text style={styles.eyebrow}>What You Get</Text>
        <Text style={styles.sectionTitle}>Spot the blind spots before they turn into weird little disconnects.</Text>
        <View style={styles.flowGrid}>
          <FlowStepCard
            step="01"
            title="Notice the gaps"
            body="Catch the everyday things you assume you know, but have never really checked."
          />
          <FlowStepCard
            step="02"
            title="Ask better questions"
            body="Leave with clearer openings for better conversations instead of vague guessing."
          />
          <FlowStepCard
            step="03"
            title="Keep it light"
            body="Move through the quiz without shame, pressure, or a pass-fail label hanging over you."
          />
        </View>
      </View>

      <View style={styles.landingSectionCard}>
        <Text style={styles.eyebrow}>Quick Questions</Text>
        <Text style={styles.sectionTitle}>The doubts people usually have before they start.</Text>
        <View style={styles.faqStack}>
          <FaqCard
            question="Is this going to get too serious?"
            answer="No. The quiz is short, conversational, and meant to spark curiosity, not drag you into an intense relationship intervention."
          />
          <FaqCard
            question="Will this judge our relationship?"
            answer="No. There is no compatibility score and no pass-fail result. You just get a clearer view of what feels known and what still needs attention."
          />
          <FaqCard
            question="What happens after I start?"
            answer="You answer a short set of prompts, get a reflection-focused summary, and leave with a few better questions to ask or notice over time."
          />
        </View>
      </View>
    </View>
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
        <Text style={styles.heroTagText}>Inside Love Better</Text>
      </View>

      <Text style={styles.displayTitle}>Choose your next self-check and move at your own pace.</Text>

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
          return (
            <PackCardButton
              key={pack.id}
              pack={pack}
              disabled={props.hasInProgressSession}
              onPress={() => props.onSelectPack(pack.id)}
            />
          );
        })}
      </View>

      <Text style={styles.supportText}>
        {props.lastCompletedAt
          ? `Last completed session saved ${formatDate(props.lastCompletedAt)}. Pick a new mode whenever you want another snapshot.`
          : "Pick any mode to begin a new self-check."}
      </Text>
    </View>
  );
}

function FlowStepCard(props: { step: string; title: string; body: string }) {
  return (
    <View style={styles.flowCard}>
      <Text style={styles.flowStep}>{props.step}</Text>
      <Text style={styles.flowTitle}>{props.title}</Text>
      <Text style={styles.flowBody}>{props.body}</Text>
    </View>
  );
}

function FaqCard(props: { question: string; answer: string }) {
  return (
    <View style={styles.faqCard}>
      <Text style={styles.faqQuestion}>{props.question}</Text>
      <Text style={styles.faqAnswer}>{props.answer}</Text>
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
        <Text style={styles.cardBody}>You will answer up to 12 prompts with Yes or No.</Text>
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

function PackCardButton(props: {
  pack: QuestionPack;
  disabled: boolean;
  onPress: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isStandard = props.pack.id === "standard";

  return (
    <Pressable
      disabled={props.disabled}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={props.onPress}
      style={[
        styles.packCard,
        isStandard ? styles.packCardPrimary : null,
        isHovered && !props.disabled
          ? isStandard
            ? styles.packCardHoverPrimary
            : styles.packCardHover
          : null,
        props.disabled ? styles.packCardDisabled : null,
      ]}
    >
      <View style={styles.packCardHeader}>
        <Text style={[styles.packCardTitle, isStandard ? styles.packCardTitlePrimary : null]}>
          {props.pack.label}
        </Text>
        {isStandard ? <Text style={styles.packBadge}>Recommended</Text> : null}
      </View>
      <Text style={[styles.packCardBody, isStandard ? styles.packCardBodyPrimary : null]}>
        {props.pack.description}
      </Text>
    </Pressable>
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
  answerSummary: { yes: number; no: number };
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
        <SummaryCard title="Known" value={props.answerSummary.yes} tone="warm" />
        <SummaryCard title="Still open" value={props.answerSummary.no} tone="light" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Things to explore</Text>
        <Text style={styles.cardBody}>
          Start with what feels easy: ask directly, notice patterns over time, or make room for more intentional time together.
        </Text>

        {props.exploreItems.length === 0 ? (
          <Text style={styles.emptyState}>
            Nothing landed in the open bucket this time. That does not mean you know everything, only that this set felt clear today.
          </Text>
        ) : (
          props.exploreItems.map((item) => (
            <View key={item.question.id} style={styles.exploreRow}>
              <View style={styles.exploreHeader}>
                <Text style={styles.exploreCategory}>{item.question.category}</Text>
                <Text style={styles.exploreAnswer}>{formatAnswer(item.answer)}</Text>
              </View>
              <Text style={styles.explorePrompt}>{item.question.text}</Text>
              <Text style={styles.exploreNudge}>{item.feedback}</Text>
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
  trackerRows: CategoryKnowledgeTracker[];
  noCardItems: DashboardNoCardItem[];
  selectedNoCard: DashboardNoCardItem | null;
  isConfirmingClearData: boolean;
  onBack: () => void;
  onCancelClearData: () => void;
  onConfirmClearData: () => void;
  onOpenNoCard: (questionId: string) => void;
  onCloseNoCard: () => void;
  onRequestClearData: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Dashboard</Text>
      <Text style={styles.sectionTitle}>How much you know your partner, by category.</Text>
      <Text style={styles.sectionBody}>
        Each percentage reflects your latest saved Yes answers against the full question bank in that category.
      </Text>

      <View style={styles.rowActions}>
        <Pressable style={styles.secondaryButton} onPress={props.onBack}>
          <Text style={styles.secondaryButtonText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Knowledge tracker</Text>
        <View style={styles.trackerGrid}>
          {props.trackerRows.map((item) => (
            <KnowledgeDial
              key={item.category}
              category={item.category}
              percentage={item.percentage}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Things to explore</Text>
        <Text style={styles.cardBody}>
          These are questions you answered No before. Tap any card to open a tip for how you can learn the answer more naturally.
        </Text>
        {props.noCardItems.length === 0 ? (
          <Text style={styles.emptyState}>
            No historical No answers saved yet. Finish a session with a few open questions and they will appear here.
          </Text>
        ) : (
          <View style={styles.noCardGrid}>
            {props.noCardItems.map((item) => (
              <Pressable
                key={item.question.id}
                style={styles.noCardButton}
                onPress={() => props.onOpenNoCard(item.question.id)}
              >
                <Text style={styles.noCardQuestion}>{item.question.text}</Text>
              </Pressable>
            ))}
          </View>
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

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(props.selectedNoCard)}
        onRequestClose={props.onCloseNoCard}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={props.onCloseNoCard} />
          {props.selectedNoCard ? (
            <View style={styles.modalCard}>
              <Text style={styles.eyebrow}>Tip</Text>
              <Text style={styles.modalQuestion}>{props.selectedNoCard.question.text}</Text>
              <Text style={styles.modalFeedback}>{props.selectedNoCard.question.feedbackNo}</Text>
              <Pressable style={styles.primaryButtonCompact} onPress={props.onCloseNoCard}>
                <Text style={styles.primaryButtonText}>Close</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
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

function KnowledgeDial(props: { category: string; percentage: number }) {
  const size = 112;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.max(0, Math.min(100, props.percentage));
  const dashOffset = circumference * (1 - clampedPercentage / 100);

  return (
    <View style={styles.trackerDialCard}>
      <View style={styles.trackerDialShell}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(49, 35, 31, 0.08)"
            strokeWidth={strokeWidth}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.coral}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            originX={size / 2}
            originY={size / 2}
            rotation={-90}
          />
        </Svg>
        <View pointerEvents="none" style={styles.trackerDialCenter}>
          <Text style={styles.trackerDialPercentage}>{clampedPercentage}%</Text>
        </View>
      </View>
      <Text style={styles.trackerDialCategory}>{props.category}</Text>
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
  landingHero: {
    gap: 22,
    padding: 28,
    borderRadius: 40,
    backgroundColor: "rgba(255, 250, 243, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(49, 35, 31, 0.08)",
    ...webShadow,
  },
  landingDisplayTitle: {
    color: theme.ink,
    fontSize: 56,
    lineHeight: 62,
    fontWeight: "900",
    letterSpacing: -1.8,
    maxWidth: 760,
  },
  heroBody: {
    color: theme.mutedInk,
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 700,
  },
  landingSectionCard: {
    backgroundColor: "rgba(255, 250, 243, 0.78)",
    borderRadius: 34,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 24,
    gap: 18,
    ...webShadow,
  },
  flowGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  flowCard: {
    flexBasis: 220,
    flexGrow: 1,
    minHeight: 182,
    borderRadius: 28,
    backgroundColor: "rgba(255, 253, 249, 0.92)",
    borderWidth: 1,
    borderColor: theme.line,
    padding: 20,
    gap: 10,
  },
  flowStep: {
    color: theme.coral,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  flowTitle: {
    color: theme.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  flowBody: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
  faqStack: {
    gap: 14,
  },
  faqCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: "rgba(255, 253, 249, 0.94)",
    padding: 20,
    gap: 10,
  },
  faqQuestion: {
    color: theme.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  faqAnswer: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  previewPackCard: {
    flexBasis: 210,
    flexGrow: 1,
    minHeight: 156,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: "rgba(255, 253, 249, 0.94)",
    padding: 20,
    gap: 10,
  },
  previewPackCardPrimary: {
    backgroundColor: "#342724",
    borderColor: "#342724",
  },
  previewPackKicker: {
    color: "#f6d8cc",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  previewPackTitle: {
    color: theme.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  previewPackTitlePrimary: {
    color: "#fff7f1",
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
  },
  previewPackBody: {
    color: theme.mutedInk,
    fontSize: 15,
    lineHeight: 24,
  },
  previewPackBodyPrimary: {
    color: "#f6d8cc",
    fontSize: 15,
    lineHeight: 24,
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
  packCardHover: {
    transform: [{ scale: 1.03 }],
    borderColor: "rgba(221, 93, 67, 0.28)",
    ...webHoverGlow,
  },
  packCardHoverPrimary: {
    transform: [{ scale: 1.03 }],
    ...webHoverGlowPrimary,
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
  trackerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  trackerDialCard: {
    flexBasis: 150,
    flexGrow: 1,
    maxWidth: 170,
    minWidth: 136,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: "rgba(255, 253, 249, 0.92)",
    borderWidth: 1,
    borderColor: theme.line,
  },
  trackerDialShell: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  trackerDialCenter: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  trackerDialPercentage: {
    color: theme.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  trackerDialCategory: {
    color: theme.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "center",
    minHeight: 42,
  },
  noCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  noCardButton: {
    flexBasis: 220,
    flexGrow: 1,
    minHeight: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: "rgba(255, 253, 249, 0.94)",
    padding: 18,
    justifyContent: "center",
    ...webShadow,
  },
  noCardQuestion: {
    color: theme.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(49, 35, 31, 0.38)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    borderRadius: 30,
    backgroundColor: "rgba(255, 250, 243, 0.98)",
    borderWidth: 1,
    borderColor: theme.line,
    padding: 24,
    gap: 16,
    zIndex: 1,
    ...webShadow,
  },
  modalQuestion: {
    color: theme.ink,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  modalFeedback: {
    color: theme.mutedInk,
    fontSize: 16,
    lineHeight: 26,
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


