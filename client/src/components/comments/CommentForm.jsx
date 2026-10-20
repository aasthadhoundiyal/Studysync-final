import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, AlertCircle, X, Loader2 } from 'lucide-react';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import { CommentPendingAttachments } from './CommentAttachment';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

// Whitelist and size limits matching backend rules
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_SIZE_MB = 30;
const MAX_CONTENT_LENGTH = 2000;
const CATEGORY_LIMITS_MB = {
  image: 5,
  video: 30,
  document: 20,
};

function getFileCategory(ext) {
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (ext === 'mp4') return 'video';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'document';
  return null;
}

export function CommentForm({
  onSubmit,
  placeholder = 'Write a helpful explanation, answer, or question...',
  buttonText = 'Comment',
  onCancel,
  initialContent = '',
  autoFocus = false,
  compact = false,
}) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [content, setContent] = useState(initialContent);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end of text
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  // Validate incoming files according to backend rules
  const handleFileChange = (e) => {
    setErrorMessage(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newTotalCount = selectedFiles.length + files.length;
    if (newTotalCount > MAX_ATTACHMENTS) {
      setErrorMessage(`You can attach at most ${MAX_ATTACHMENTS} files in a comment.`);
      e.target.value = '';
      return;
    }

    let combinedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    const validBatch = [];

    for (const file of files) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setErrorMessage(
          `File type ".${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
        e.target.value = '';
        return;
      }

      const category = getFileCategory(ext);
      const capMB = CATEGORY_LIMITS_MB[category] || 20;
      if (file.size > capMB * 1024 * 1024) {
        setErrorMessage(
          `File "${file.name}" exceeds the ${capMB} MB limit for ${category}s.`
        );
        e.target.value = '';
        return;
      }

      combinedSize += file.size;
      if (combinedSize > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
        setErrorMessage(`Total attachments size exceeds the ${MAX_TOTAL_SIZE_MB} MB limit.`);
        e.target.value = '';
        return;
      }

      validBatch.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validBatch]);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isAuthenticated) {
      toast.info('Please sign in to join the discussion');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed && selectedFiles.length === 0) {
      setErrorMessage('Please enter text or attach at least one study file.');
      return;
    }

    if (trimmed.length > MAX_CONTENT_LENGTH) {
      setErrorMessage(`Comment cannot exceed ${MAX_CONTENT_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        // Strict whitelist: Only 'content' in body
        formData.append('content', trimmed);
        selectedFiles.forEach((file) => {
          formData.append('attachments', file);
        });
        await onSubmit(formData);
      } else {
        await onSubmit({ content: trimmed });
      }

      // Reset form
      setContent('');
      setSelectedFiles([]);
      if (onCancel) onCancel();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to submit comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charsLeft = MAX_CONTENT_LENGTH - content.length;
  const isNearLimit = charsLeft < 100;

  return (
    <form onSubmit={handleSubmit} className={cn('relative', compact && 'text-xs')}>
      <div
        className={cn(
          'flex gap-3 rounded-2xl border transition-all bg-white p-3',
          errorMessage
            ? 'border-rose-300 ring-2 ring-rose-50'
            : 'border-surface-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20'
        )}
      >
        {/* User avatar preview */}
        <Avatar
          name={user?.username || 'You'}
          src={user?.profilePicture}
          size={compact ? 'sm' : 'md'}
          className="shrink-0 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            rows={compact ? 2 : 3}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={
              isAuthenticated
                ? placeholder
                : 'Sign in to share explanations, questions, or notes...'
            }
            disabled={isSubmitting || !isAuthenticated}
            maxLength={MAX_CONTENT_LENGTH}
            className="w-full resize-y bg-transparent text-xs sm:text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none leading-relaxed disabled:opacity-60"
          />

          {/* Pending attachments preview */}
          <CommentPendingAttachments
            files={selectedFiles}
            onRemove={handleRemoveFile}
          />

          {/* Error alert */}
          {errorMessage && (
            <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Controls Bar */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-surface-100">
            {/* Attachment Button & Info */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileChange}
                disabled={isSubmitting || !isAuthenticated || selectedFiles.length >= MAX_ATTACHMENTS}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || !isAuthenticated || selectedFiles.length >= MAX_ATTACHMENTS}
                aria-label="Add attachment to comment"
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-surface-600 hover:text-brand-600 hover:bg-brand-50/70 transition-colors disabled:opacity-50',
                  selectedFiles.length > 0 && 'text-brand-600 bg-brand-50/50'
                )}
                title="Attach image, video, PDF or doc (max 5 files, 30MB total)"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="text-[11px]">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length}/${MAX_ATTACHMENTS}`
                    : 'Attach file'}
                </span>
              </button>

              {content.length > 0 && (
                <span
                  className={cn(
                    'text-[10px] hidden sm:inline-block',
                    isNearLimit ? 'text-amber-600 font-semibold' : 'text-surface-400'
                  )}
                >
                  {charsLeft} left
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={onCancel}
                  className="text-surface-500 hover:text-surface-800 text-xs py-1 px-2.5"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  isSubmitting ||
                  !isAuthenticated ||
                  (!content.trim() && selectedFiles.length === 0)
                }
                isLoading={isSubmitting}
                rightIcon={!isSubmitting ? <Send className="w-3.5 h-3.5" /> : undefined}
                className="text-xs py-1 px-3.5"
              >
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default CommentForm;
