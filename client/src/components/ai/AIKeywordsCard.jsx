import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tag,
  Sparkles,
  RefreshCw,
  Search,
  Copy,
  Check,
  AlertCircle,
  Clock,
  LogIn,
} from 'lucide-react';
import Button from '@/components/common/Button';
import { getKeywords } from '@/api/ai';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';

/**
 * AIKeywordsCard — extracts and displays core educational concepts,
 * technical terms, and topics from a study post using the backend Gemini AI service.
 */
export function AIKeywordsCard({ postId, postTitle, isEmbedded = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [keywordsData, setKeywordsData] = useState(null); // { keywords: string[], generatedAt: string, cached: boolean }
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Fetch or extract keywords
  const loadKeywords = useCallback(
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
        const res = await getKeywords(postId, force);
        if (res?.success && Array.isArray(res?.keywords)) {
          setKeywordsData({
            keywords: res.keywords,
            generatedAt: res.generatedAt,
            cached: Boolean(res.cached),
          });
        } else {
          throw new Error(res?.message || 'Empty or invalid keywords response received');
        }
      } catch (err) {
        console.error('[AIKeywordsCard] Error fetching keywords:', err);
        setErrorStatus(err?.status || 0);

        if (err?.status === 503) {
          setError('AI keyword extraction is temporarily unavailable. Please try again shortly.');
        } else if (err?.status === 400 && (err?.message || '').toLowerCase().includes('no text content')) {
          setError('This post does not contain enough text content for keyword extraction.');
        } else if (err?.status === 404) {
          setError('This study post could not be found or is not published.');
        } else if (err?.status === 401) {
          setError('Please sign in to extract and explore AI keywords.');
        } else {
          setError(err?.message || 'Unable to extract keywords. Please try again later.');
        }
      } finally {
        setIsLoading(false);
        setIsRegenerating(false);
      }
    },
    [postId, isAuthenticated]
  );

  useEffect(() => {
    loadKeywords(false);
  }, [loadKeywords]);

  // Copy all keywords as comma-separated string
  const handleCopyKeywords = async () => {
    if (!keywordsData?.keywords?.length) return;
    try {
      const text = keywordsData.keywords.join(', ');
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setHasCopied(true);
      toast.success('Keywords copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.info('Could not copy automatically.');
    }
  };

  // 0. Unauthenticated Guard
  if (!isAuthenticated) {
    return (
      <div className={cn('p-6 text-center space-y-3 rounded-2xl bg-surface-50 border border-surface-200', isEmbedded && 'shadow-sm')}>
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mx-auto">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-surface-900">Sign in for Keyword Extraction</h4>
          <p className="text-[11px] text-surface-500 mt-0.5">
            StudySync AI extracts key topics and concepts to help students explore related study materials.
          </p>
        </div>
        <div className="pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            leftIcon={<LogIn className="w-3.5 h-3.5" />}
          >
            Sign in to Extract Keywords
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
            <Tag className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h4 className="text-xs font-bold text-surface-900">Extracting Core Topics...</h4>
          <p className="text-[11px] text-surface-500">
            Analyzing technical terminology, core principles, and academic keywords.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !keywordsData?.keywords?.length) {
    return (
      <div className="p-5 rounded-2xl bg-surface-50 border border-surface-200 space-y-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-xs font-bold text-surface-900">
            {errorStatus === 503 ? 'AI Service Notice' : 'Keywords Unavailable'}
          </h4>
          <p className="text-xs text-surface-600 leading-relaxed">
            {error || 'No keywords could be extracted from this post.'}
          </p>
        </div>
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadKeywords(true)}
            isLoading={isRegenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="bg-white text-xs"
          >
            Retry Extraction
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
          <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-surface-900 leading-tight">
              Key Academic Topics & Concepts
            </h4>
            {keywordsData.generatedAt && (
              <span className="text-[10px] text-surface-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDate(keywordsData.generatedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              keywordsData.cached
                ? 'bg-surface-100 text-surface-600 border-surface-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
            title={keywordsData.cached ? 'Loaded from instant cache' : 'Extracted fresh'}
          >
            {keywordsData.cached ? 'Cached' : 'Fresh'}
          </span>

          <button
            type="button"
            onClick={handleCopyKeywords}
            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Copy keywords list"
            aria-label="Copy keywords"
          >
            {hasCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => loadKeywords(true)}
            disabled={isRegenerating}
            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
            title="Regenerate keywords"
            aria-label="Regenerate keywords"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin text-brand-600')}
            />
          </button>
        </div>
      </div>

      {/* Explanatory subtitle */}
      <p className="text-xs text-surface-500">
        Click any keyword below to explore related study posts and notes across StudySync:
      </p>

      {/* Keywords Chips Grid */}
      <div className="flex flex-wrap gap-2 pt-1">
        {keywordsData.keywords.map((kw) => (
          <Link
            key={kw}
            to={`/search?q=${encodeURIComponent(kw)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-50 hover:bg-brand-50 text-surface-700 hover:text-brand-700 border border-surface-200/80 hover:border-brand-300 transition-all shadow-xs group"
            title={`Search study posts for "${kw}"`}
          >
            <span className="text-surface-400 group-hover:text-brand-500 font-normal">#</span>
            <span className="capitalize">{kw}</span>
            <Search className="w-3 h-3 text-surface-400 group-hover:text-brand-600 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Footer Meta */}
      <div className="pt-2 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-600" /> {keywordsData.keywords.length} concepts extracted
        </span>
        <button
          type="button"
          onClick={handleCopyKeywords}
          className="text-brand-600 hover:underline font-medium"
        >
          {hasCopied ? 'Copied!' : 'Copy all'}
        </button>
      </div>
    </div>
  );
}

export default AIKeywordsCard;
