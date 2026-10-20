import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Clock,
  LogIn,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { getSummary } from '@/api/ai';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';

/**
 * AISummaryCard — fetches, displays, and caches an AI-generated
 * summary of a study post powered by the backend Gemini AI service.
 */
export function AISummaryCard({ postId, postTitle, isEmbedded = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [summaryData, setSummaryData] = useState(null); // { summary: string, generatedAt: string, cached: boolean }
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Fetch or generate summary
  const loadSummary = useCallback(
    async (force = false) => {
      if (!postId || !isAuthenticated) return;

      if (force) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setErrorStatus(null);

      try {
        const res = await getSummary(postId, force);
        if (res?.success && res?.summary) {
          setSummaryData({
            summary: res.summary,
            generatedAt: res.generatedAt,
            cached: Boolean(res.cached),
          });
        } else {
          throw new Error(res?.message || 'Empty or invalid summary response received');
        }
      } catch (err) {
        console.error('[AISummaryCard] Error fetching summary:', err);
        setErrorStatus(err?.status || 0);

        if (err?.status === 503) {
          setError('AI summary service is temporarily unavailable. Please try again shortly.');
        } else if (err?.status === 400 && (err?.message || '').toLowerCase().includes('no text content')) {
          setError('This post does not contain enough text content to summarize.');
        } else if (err?.status === 404) {
          setError('This study post could not be found or is not published.');
        } else if (err?.status === 401) {
          setError('Please sign in to generate and view AI study summaries.');
        } else {
          setError(err?.message || 'Unable to generate summary. Please try again later.');
        }
      } finally {
        setIsLoading(false);
        setIsRegenerating(false);
      }
    },
    [postId, isAuthenticated]
  );

  useEffect(() => {
    loadSummary(false);
  }, [loadSummary]);

  // Copy summary to clipboard
  const handleCopy = async () => {
    if (!summaryData?.summary) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryData.summary);
      }
      setHasCopied(true);
      toast.success('Summary copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.info('Could not copy automatically. You can highlight and copy the text.');
    }
  };

  // 0. Unauthenticated Guard
  if (!isAuthenticated) {
    return (
      <div className={cn('p-6 text-center space-y-3 rounded-2xl bg-surface-50 border border-surface-200', isEmbedded && 'shadow-sm')}>
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mx-auto">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-surface-900">Sign in for AI Summaries</h4>
          <p className="text-[11px] text-surface-500 mt-0.5">
            StudySync AI synthesizes concise executive summaries for registered students.
          </p>
        </div>
        <div className="pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
          >
            Sign in to View Summary
          </Button>
        </div>
      </div>
    );
  }

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="p-6 text-center space-y-3 rounded-2xl bg-surface-50/70 border border-surface-200">
        <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-brand-500/10 animate-ping" />
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h4 className="text-xs font-bold text-surface-900">Distilling Key Concepts...</h4>
          <p className="text-[11px] text-surface-500">
            Analyzing post content and writing a concise 3–6 sentence academic executive summary.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !summaryData?.summary) {
    return (
      <div className="p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-xs font-bold text-surface-900">
            {errorStatus === 503 ? 'AI Service Notice' : 'Summary Unavailable'}
          </h4>
          <p className="text-xs text-surface-600 leading-relaxed">
            {error || 'No summary could be generated for this post.'}
          </p>
        </div>
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSummary(true)}
            isLoading={isRegenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-white text-xs"
          >
            Retry Summary
          </Button>
        </div>
      </div>
    );
  }

  // 3. Success State
  return (
    <div className="p-5 rounded-2xl bg-white border border-surface-200 shadow-xs space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-surface-100 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-surface-900 leading-tight">
              Executive AI Summary
            </h4>
            {summaryData.generatedAt && (
              <span className="text-[10px] text-surface-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDate(summaryData.generatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              summaryData.cached
                ? 'bg-surface-100 text-surface-600 border-surface-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
            title={summaryData.cached ? 'Loaded from instant cache' : 'Generated fresh'}
          >
            {summaryData.cached ? 'Cached' : 'Fresh'}
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Copy summary text"
            aria-label="Copy summary"
          >
            {hasCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => loadSummary(true)}
            disabled={isRegenerating}
            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Regenerate summary from post"
            aria-label="Regenerate summary"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin text-brand-600')}
            />
          </button>
        </div>
      </div>

      {/* Summary Content Body */}
      <div className="text-xs sm:text-sm text-surface-800 leading-relaxed space-y-2 break-words whitespace-pre-wrap">
        {summaryData.summary}
      </div>

      {/* Footer Meta */}
      <div className="pt-2 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-600" /> Synthesized with AI Assistant
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-brand-600 hover:underline font-medium"
        >
          {hasCopied ? 'Copied!' : 'Copy text'}
        </button>
      </div>
    </div>
  );
}

export default AISummaryCard;
