import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/axios';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SECTION_ORDER = ['quantitative', 'verbal', 'technical', 'coding'];

export function isAnswered(answer) {
  if (!answer) return false;
  return (
    (typeof answer.selected_option === 'string' && answer.selected_option !== '') ||
    (typeof answer.answer_text === 'string' && answer.answer_text.trim() !== '') ||
    answer.code_submitted === true
  );
}

// Fire-and-forget answer save with one automatic retry
async function pushAnswerToServer(candidateExamId, questionId, answerData, retries = 1) {
  try {
    await api.post('/exam/answer', {
      candidate_exam_id: candidateExamId,
      question_id: questionId,
      ...answerData,
    });
    useExamSessionStore.setState((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { ...(state.answers[questionId] ?? {}), is_saved: true },
      },
    }));
  } catch {
    if (retries > 0) {
      setTimeout(() => pushAnswerToServer(candidateExamId, questionId, answerData, retries - 1), 2000);
    }
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

const useExamSessionStore = create(
  persist(
    (set, get) => ({
      candidateExam: null,
      exam: null,
      questions: [],          // flat array, ordered by order_index
      sections: [],           // section names in canonical order
      answers: {},            // { [question_id]: { selected_option, answer_text, is_saved, code_submitted } }
      currentQuestionId: null,
      durationSeconds: null,  // total exam duration in seconds
      timeRemaining: null,    // seconds left
      timerStartedAt: null,   // JS timestamp when timer was initialised (for drift correction)
      isTimeUp: false,
      isSubmitted: false,
      isSubmitting: false,
      sessionStartedAt: null, // ISO string
      submissionStats: null,  // kept after submit for ExamSubmittedPage
      codeByQuestion: {},     // { [questionId]: { python: '', javascript: '', cpp: '' } }
      codeResults: {},        // { [questionId]: submissionResult }
      mediaStream: null,      // MediaStream — not persisted (cannot be serialized)

      // ── initSession ──────────────────────────────────────────────────────

      initSession: (candidateExam, exam, existingAnswers = []) => {
        const questions = [...(exam.examQuestions ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((eq) => ({ ...eq.question, order_index: eq.order_index }));

        const sections = SECTION_ORDER.filter(
          (s) => Array.isArray(exam.sections) && exam.sections.includes(s)
        );

        const answers = {};
        for (const sub of existingAnswers) {
          answers[sub.question_id] = {
            selected_option: sub.selected_option ?? null,
            answer_text: sub.answer_text ?? null,
            is_saved: true,
          };
        }

        const startedAt = candidateExam.started_at
          ? new Date(candidateExam.started_at)
          : new Date();
        const durationSeconds = exam.duration_minutes * 60;
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        const timeRemaining = Math.max(0, durationSeconds - elapsed);
        const timerStartedAt = Date.now();

        set({
          candidateExam,
          exam,
          questions,
          sections,
          answers,
          currentQuestionId: questions[0]?.id ?? null,
          durationSeconds,
          timeRemaining,
          timerStartedAt,
          isTimeUp: timeRemaining === 0,
          isSubmitted: false,
          isSubmitting: false,
          sessionStartedAt: candidateExam.started_at ?? new Date().toISOString(),
          submissionStats: null,
        });
      },

      // ── saveAnswer ───────────────────────────────────────────────────────

      saveAnswer: (questionId, answerData) => {
        const { candidateExam, answers } = get();
        if (!candidateExam) return;

        set({
          answers: {
            ...answers,
            [questionId]: {
              ...(answers[questionId] ?? {}),
              ...answerData,
              is_saved: false,
            },
          },
        });

        pushAnswerToServer(candidateExam.id, questionId, answerData);
      },

      // ── navigation ───────────────────────────────────────────────────────

      setCurrentQuestion: (questionId) => set({ currentQuestionId: questionId }),

      // ── timer ────────────────────────────────────────────────────────────

      tick: () => {
        const { timeRemaining, isSubmitted, isSubmitting, isTimeUp } = get();
        if (isSubmitted || isSubmitting || isTimeUp || timeRemaining === null) return;
        const next = Math.max(0, timeRemaining - 1);
        if (next === 0) {
          set({ timeRemaining: 0, isTimeUp: true });
        } else {
          set({ timeRemaining: next });
        }
      },

      // ── submitExam ───────────────────────────────────────────────────────

      submitExam: async () => {
        const {
          candidateExam, questions, answers, sections,
          isSubmitted, isSubmitting, sessionStartedAt,
        } = get();
        if (isSubmitted || isSubmitting || !candidateExam) return;

        set({ isSubmitting: true });
        try {
          await api.post('/exam/submit', { candidate_exam_id: candidateExam.id });

          const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
          const perSection = {};
          for (const s of sections) {
            const sqs = questions.filter((q) => q.section === s);
            perSection[s] = {
              answered: sqs.filter((q) => isAnswered(answers[q.id])).length,
              total: sqs.length,
            };
          }

          const timeTakenSeconds = sessionStartedAt
            ? Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000)
            : null;

          set({
            isSubmitted: true,
            isSubmitting: false,
            submissionStats: { answeredCount, totalCount: questions.length, sections, perSection, timeTakenSeconds },
            // Clear exam data from memory/storage after submit
            exam: null,
            questions: [],
            answers: {},
            currentQuestionId: null,
            timeRemaining: 0,
            durationSeconds: null,
            timerStartedAt: null,
          });

          try { sessionStorage.removeItem('exam-session'); } catch { /* ignore */ }
        } catch {
          set({ isSubmitting: false });
        }
      },

      // ── saveCode ─────────────────────────────────────────────────────────

      saveCode: (questionId, language, code) => {
        const { codeByQuestion } = get();
        set({
          codeByQuestion: {
            ...codeByQuestion,
            [questionId]: {
              ...(codeByQuestion[questionId] ?? {}),
              [language]: code,
            },
          },
        });
      },

      // ── mediaStream ──────────────────────────────────────────────────────

      setMediaStream: (stream) => set({ mediaStream: stream }),

      // ── saveCodeResult ────────────────────────────────────────────────────

      saveCodeResult: (questionId, result) => {
        const { codeResults, answers } = get();
        set({
          codeResults: { ...codeResults, [questionId]: result },
          answers: {
            ...answers,
            [questionId]: {
              ...(answers[questionId] ?? {}),
              code_submitted: true,
            },
          },
        });
      },

      // ── computed helpers ─────────────────────────────────────────────────

      getAnsweredCount: () => {
        const { questions, answers } = get();
        return questions.filter((q) => isAnswered(answers[q.id])).length;
      },

      getQuestionsBySection: (section) => {
        return get().questions.filter((q) => q.section === section);
      },
    }),
    {
      name: 'exam-session',
      storage: createJSONStorage(() => sessionStorage),
      // Exclude non-serializable values and ephemeral state from storage
      partialize: ({ getAnsweredCount, getQuestionsBySection, saveCode, saveCodeResult, codeResults, mediaStream, setMediaStream, isTimeUp, ...rest }) => rest,
    }
  )
);

export default useExamSessionStore;
