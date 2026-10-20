import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Send, RefreshCw } from 'lucide-react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import Badge from '@/components/common/Badge';
import Alert from '@/components/common/Alert';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { submitAppeal, getMyAppeals } from '@/api/appeals';
import { formatDate } from '@/utils/formatters';

export function AppealsPage() {
  const [contentId, setContentId] = useState('');
  const [contentType, setContentType] = useState('post');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appeals, setAppeals] = useState([]);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  const fetchAppeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getMyAppeals({ limit: 20 });
      if (res?.success && Array.isArray(res.appeals)) {
        setAppeals(res.appeals);
      }
    } catch (err) {
      console.error('Failed to load appeals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedReason = reason.trim();
    const trimmedId = contentId.trim();

    if (!trimmedId) {
      setFeedback({ type: 'error', message: 'Please enter a valid Content ID.' });
      return;
    }
    if (trimmedReason.length < 10) {
      setFeedback({ type: 'error', message: 'Reason must be at least 10 characters long.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitAppeal({
        contentType,
        contentId: trimmedId,
        reason: trimmedReason,
      });

      if (res?.success) {
        setFeedback({
          type: 'success',
          message: 'Your appeal has been submitted successfully and added to the administrative review queue.',
        });
        setReason('');
        setContentId('');
        // Refresh appeals list
        fetchAppeals();
      } else {
        setFeedback({
          type: 'error',
          message: res?.message || 'Failed to submit appeal. Please try again.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to submit appeal.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="success" size="sm" dot>
            Approved & Restored
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" size="sm" dot>
            Appeal Denied
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" size="sm" dot>
            Pending Admin Review
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          Content Moderation Appeals
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          If your study post or comment was removed by automated moderation or administrative action, you can submit an appeal for review.
        </p>
      </div>

      {feedback && (
        <Alert
          variant={feedback.type === 'success' ? 'success' : 'danger'}
          title={feedback.type === 'success' ? 'Appeal Submitted' : 'Submission Error'}
        >
          {feedback.message}
        </Alert>
      )}

      {/* Appeal Submission Form */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-surface-900 mb-4">
          Submit Content Appeal
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase block mb-1.5">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full rounded-xl bg-white border border-surface-200 px-3.5 py-2.5 text-xs text-surface-800 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="post">Study Post</option>
                <option value="comment">Comment / Reply</option>
              </select>
            </div>

            <Input
              label="Content ID"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              placeholder="e.g. 66f0a1b2c3d4..."
              helperText="The 24-character ID from your removal notice"
              required
            />
          </div>

          <Textarea
            label="Reason for Appeal (10-1000 characters)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you believe the moderation action was mistaken and how your material adheres to academic honor standards..."
            rows={4}
            maxLength={1000}
            required
            helperText={`${reason.length}/1000 characters (minimum 10)`}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              rightIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit Appeal
            </Button>
          </div>
        </form>
      </Card>

      {/* Past Appeals History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-900">
            Your Appeal History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAppeals}
            leftIcon={<RefreshCw className="w-3 h-3" />}
          >
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Spinner size="md" />
            <span className="text-xs text-surface-400">Loading appeal records...</span>
          </div>
        ) : appeals.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No Appeals Submitted"
            description="You currently have no submitted appeals. Only content that has been marked as removed can be appealed."
          />
        ) : (
          appeals.map((app) => (
            <Card key={app._id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-surface-900 uppercase tracking-wide">
                    {app.contentType}
                  </span>
                  <span className="text-[11px] font-mono text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded">
                    {app.contentId}
                  </span>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <div className="text-xs text-surface-700 bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                <span className="font-semibold text-surface-800">Your explanation: </span>
                {app.reason}
              </div>

              {app.adminNote && (
                <div className="text-xs text-brand-900 bg-brand-50/70 p-2.5 rounded-lg border border-brand-200/60">
                  <span className="font-semibold text-brand-800">Admin Note: </span>
                  {app.adminNote}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-surface-400 pt-1">
                <span>Submitted: {formatDate(app.createdAt)}</span>
                {app.reviewedAt && (
                  <span>Reviewed: {formatDate(app.reviewedAt)}</span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default AppealsPage;
