import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Award,
  Trophy,
  Lightbulb,
  Check,
  RotateCcw,
  BookOpen,
  Zap,
  LogIn,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { getQuiz } from '@/api/ai';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

/**
 * Difficulty badge helper
 */
function getDifficultyBadge(difficulty) {
  switch ((difficulty || '').toLowerCase()) {
    case 'easy':
      return <Badge variant="success" size="sm">Easy</Badge>;
    case 'hard':
      return <Badge variant="danger" size="sm">Hard</Badge>;
    case 'medium':
    default:
      return <Badge variant="brand" size="sm">Medium</Badge>;
  }
}

/**
 * QuizRunner: Core AI Quiz engine component.
 * Supports generating from Gemini, step-by-step answering, scoring,
 * reviewing answers with explanations, retaking, and cache regeneration.
 */
export function QuizRunner({ postId, postTitle, onClose, isEmbedded = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [quizData, setQuizData] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);

  // Quiz active flow states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionIndex]: 'A' | 'B' | 'C' | 'D' }
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);

  // Fetch or generate quiz from backend
  const loadQuiz = useCallback(async (force = false) => {
    if (!postId || !isAuthenticated) return;

    if (force) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setErrorStatus(null);
    setShowUnansweredWarning(false);

    try {
      const res = await getQuiz(postId, force);
      if (res?.success && res?.quiz) {
        setQuizData(res.quiz);
        setIsCached(Boolean(res.cached));
        setCurrentIndex(0);
        setUserAnswers({});
        setIsSubmitted(false);
      } else {
        throw new Error(res?.message || 'Empty or invalid quiz response received');
      }
    } catch (err) {
      console.error('[QuizRunner] Failed to load quiz:', err);
      setErrorStatus(err?.status || 0);

      if (err?.status === 503) {
        setError('The AI study quiz service is currently busy or temporarily unavailable. Please try again shortly.');
      } else if (err?.status === 404) {
        setError('This study post could not be found or is not published.');
      } else if (err?.status === 401) {
        setError('Please sign in to generate and take study quizzes.');
      } else {
        setError(err?.message || 'Unable to generate quiz. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
    }
  }, [postId, isAuthenticated]);

  useEffect(() => {
    loadQuiz(false);
  }, [loadQuiz]);

  const questions = quizData?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;

  // Handle option selection
  const handleSelectOption = (optionLabel) => {
    if (isSubmitted) return; // Prevent changing after submit
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionLabel,
    }));
  };

  // Answer tracking metrics
  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const unansweredCount = totalQuestions - answeredCount;

  // Navigation handlers
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowUnansweredWarning(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowUnansweredWarning(false);
    }
  };

  // Submit handler
  const handleSubmit = (forceSubmit = false) => {
    if (!forceSubmit && !isAllAnswered) {
      setShowUnansweredWarning(true);
      return;
    }
    setShowUnansweredWarning(false);
    setIsSubmitted(true);
    setCurrentIndex(0); // Reset to first question for review
    toast.success('Quiz submitted! Review your score and explanations below.');
  };

  // Retake quiz (resets answers locally without re-calling API)
  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
    setCurrentIndex(0);
    setShowUnansweredWarning(false);
  };

  // Score calculations
  const calculateScore = () => {
    if (!totalQuestions) return { score: 0, percentage: 0 };
    let correct = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correct += 1;
      }
    });
    const percentage = Math.round((correct / totalQuestions) * 100);
    return { score: correct, percentage };
  };

  const { score, percentage } = calculateScore();

  // ── 0. UNAUTHENTICATED GUARD ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className={cn('p-8 text-center space-y-4 rounded-2xl bg-white border border-surface-200/90', isEmbedded && 'shadow-sm')}>
        <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-surface-900">
            Sign in to Generate AI Quizzes
          </h3>
          <p className="text-xs text-surface-500 leading-relaxed">
            Interactive multiple-choice quizzes are generated automatically for registered students. Sign in to test your knowledge and track comprehension.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
          >
            Sign in to Generate Quiz
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── 1. LOADING STATE ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn('p-8 text-center space-y-4 rounded-2xl bg-white border border-surface-200/90', isEmbedded && 'shadow-sm')}>
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-brand-500/10 animate-ping" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/25 animate-pulse">
            <Sparkles className="w-7 h-7" />
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-surface-900">
            Synthesizing AI Study Quiz...
          </h3>
          <p className="text-xs text-surface-500 leading-relaxed">
            Analyzing post concepts, generating multiple-choice questions, and crafting academic explanations.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-brand-600 font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Typically takes 3–5 seconds</span>
        </div>
      </div>
    );
  }

  // ── 2. ERROR STATE ────────────────────────────────────────────────────────
  if (error || !quizData || totalQuestions === 0) {
    return (
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-surface-200/90 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-sm sm:text-base font-bold text-surface-900">
            {errorStatus === 503 ? 'AI Service Notice' : 'Quiz Generation Unavailable'}
          </h3>
          <p className="text-xs text-surface-600 leading-relaxed">
            {error || 'No questions could be extracted from this post. The post may be too brief or contain insufficient conceptual content.'}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => loadQuiz(true)}
            isLoading={isRegenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Generation
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── 3. RESULTS VIEW (AFTER SUBMISSION) ────────────────────────────────────
  if (isSubmitted) {
    const isPerfect = percentage === 100;
    const isPassing = percentage >= 70;

    return (
      <div className="space-y-6">
        {/* Score Summary Banner */}
        <div
          className={cn(
            'p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left transition-all',
            isPerfect
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border-emerald-200 text-emerald-950'
              : isPassing
              ? 'bg-gradient-to-br from-brand-50 via-indigo-50/50 to-white border-brand-200 text-brand-950'
              : 'bg-gradient-to-br from-amber-50 via-orange-50/40 to-white border-amber-200 text-amber-950'
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm',
                isPerfect
                  ? 'bg-emerald-600 shadow-emerald-500/25'
                  : isPassing
                  ? 'bg-brand-600 shadow-brand-500/25'
                  : 'bg-amber-600 shadow-amber-500/25'
              )}
            >
              {isPerfect ? (
                <Trophy className="w-7 h-7" />
              ) : isPassing ? (
                <Award className="w-7 h-7" />
              ) : (
                <Lightbulb className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h3 className="text-lg font-extrabold tracking-tight">
                  {isPerfect
                    ? 'Perfect Mastery!'
                    : isPassing
                    ? 'Great Understanding!'
                    : 'Good Effort! Keep Reviewing'}
                </h3>
                <Badge variant={isPassing ? 'success' : 'brand'} size="sm">
                  {percentage}%
                </Badge>
              </div>
              <p className="text-xs text-surface-600 mt-1 max-w-sm">
                You scored <strong className="text-surface-900">{score}</strong> out of{' '}
                <strong className="text-surface-900">{totalQuestions}</strong> questions correctly. Review
                the detailed answers and explanations below.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetake}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="bg-white text-xs"
            >
              Retake Quiz
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => loadQuiz(true)}
              isLoading={isRegenerating}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Generate New
            </Button>
          </div>
        </div>

        {/* Detailed Questions Review List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-surface-200">
            <h4 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-brand-600" /> Question-by-Question Breakdown
            </h4>
            <span className="text-xs text-surface-500 font-medium">
              {score} Correct • {totalQuestions - score} Incorrect
            </span>
          </div>

          {questions.map((q, idx) => {
            const userPick = userAnswers[idx];
            const isCorrect = userPick === q.correctAnswer;

            return (
              <div
                key={q._id || idx}
                className={cn(
                  'p-5 rounded-2xl border transition-all space-y-3.5',
                  isCorrect
                    ? 'bg-white border-emerald-200/80 shadow-xs'
                    : 'bg-white border-rose-200/80 shadow-xs'
                )}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0',
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-surface-700">
                      Question {idx + 1} of {totalQuestions}
                    </span>
                    {getDifficultyBadge(q.difficulty)}
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                      isCorrect
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Correct (+1)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Incorrect</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Question Text */}
                <p className="text-xs sm:text-sm font-semibold text-surface-900 leading-snug">
                  {q.question}
                </p>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = userPick === opt.label;
                    const isRightAnswer = q.correctAnswer === opt.label;

                    return (
                      <div
                        key={opt.label}
                        className={cn(
                          'p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all',
                          isRightAnswer
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold ring-1 ring-emerald-400/40'
                            : isSelected && !isRightAnswer
                            ? 'bg-rose-50/80 border-rose-300 text-rose-950 font-medium'
                            : 'bg-surface-50 border-surface-200/80 text-surface-600 opacity-70'
                        )}
                      >
                        <span
                          className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0',
                            isRightAnswer
                              ? 'bg-emerald-600 text-white'
                              : isSelected
                              ? 'bg-rose-600 text-white'
                              : 'bg-surface-200 text-surface-700'
                          )}
                        >
                          {opt.label}
                        </span>

                        <div className="flex-1 min-w-0">
                          <span className="break-words leading-relaxed">{opt.text}</span>
                          {isRightAnswer && (
                            <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                              ✓ Correct Answer
                            </span>
                          )}
                          {isSelected && !isRightAnswer && (
                            <span className="block text-[10px] text-rose-700 font-bold mt-0.5">
                              ✕ Your Selection
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Card */}
                {q.explanation && (
                  <div className="p-3.5 rounded-xl bg-brand-50/40 border border-brand-200/70 text-xs space-y-1">
                    <span className="font-bold text-brand-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 text-brand-600" /> Academic Explanation
                    </span>
                    <p className="text-surface-700 leading-relaxed text-xs">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between border-t border-surface-200">
          <Button variant="outline" size="sm" onClick={handleRetake} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retake Quiz
          </Button>

          {onClose && (
            <Button variant="primary" size="sm" onClick={onClose}>
              Done & Return
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── 4. ACTIVE QUIZ TAKING INTERFACE ───────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Quiz Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <Zap className="w-4 h-4 fill-brand-600" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-surface-900">
              Interactive AI Quiz
            </h3>
            <p className="text-[11px] text-surface-500">
              {postTitle ? `Based on "${postTitle}"` : 'Test your comprehension'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              isCached
                ? 'bg-surface-100 text-surface-600 border-surface-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
            title={isCached ? 'Loaded from instant cache' : 'Generated fresh'}
          >
            {isCached ? 'Cached' : 'Generated Fresh'}
          </span>

          <button
            type="button"
            onClick={() => loadQuiz(true)}
            disabled={isRegenerating}
            className="p-1 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Regenerate new questions from post"
            aria-label="Regenerate quiz"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin text-brand-600')} />
          </button>
        </div>
      </div>

      {/* Progress Bar & Question Jump Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-surface-700">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-[11px] text-surface-400">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-100 overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-200"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Quick Question Selector Pills */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
          {questions.map((_, idx) => {
            const isAnswered = userAnswers[idx] !== undefined;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowUnansweredWarning(false);
                }}
                className={cn(
                  'w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center',
                  isCurrent
                    ? 'bg-brand-600 text-white ring-2 ring-brand-300'
                    : isAnswered
                    ? 'bg-brand-50 text-brand-700 border border-brand-200 font-semibold'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                )}
                aria-label={`Jump to question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      {currentQuestion && (
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-50/70 border border-surface-200/80 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">
              Question #{currentIndex + 1}
            </span>
            {getDifficultyBadge(currentQuestion.difficulty)}
          </div>

          <h4 className="text-sm sm:text-base font-bold text-surface-900 leading-snug">
            {currentQuestion.question}
          </h4>

          {/* 4 Options Grid */}
          <div className="space-y-2.5 pt-1">
            {currentQuestion.options.map((option) => {
              const isSelected = userAnswers[currentIndex] === option.label;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleSelectOption(option.label)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all duration-150 flex items-start gap-3 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    isSelected
                      ? 'bg-white border-brand-500 text-brand-950 font-semibold shadow-sm ring-2 ring-brand-500/20'
                      : 'bg-white/90 border-surface-200 text-surface-700 hover:border-surface-300 hover:bg-white'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                      isSelected
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-surface-100 text-surface-600 group-hover:bg-surface-200'
                    )}
                  >
                    {option.label}
                  </span>

                  <span className="flex-1 leading-relaxed break-words pt-0.5">
                    {option.text}
                  </span>

                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unanswered Warning Banner */}
      {showUnansweredWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have <strong>{unansweredCount}</strong> unanswered {unansweredCount === 1 ? 'question' : 'questions'}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="text-xs font-bold text-amber-800 hover:underline shrink-0"
          >
            Submit Anyway
          </button>
        </div>
      )}

      {/* Navigation & Submission Bar */}
      <div className="pt-2 flex items-center justify-between gap-3 border-t border-surface-200">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          ) : null}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit(false)}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
            className="shadow-sm shadow-brand-500/20"
          >
            Submit Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuizRunner;
