import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileUp,
  X,
  Send,
  FileText,
  Film,
  Tag,
  UploadCloud,
  File,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';
import Card, { CardContent } from '@/components/common/Card';
import Alert from '@/components/common/Alert';
import { createPost } from '@/api/posts';
import { formatBytes } from '@/utils/formatters';
import { cn } from '@/utils/cn';

// Backend attachment constants matching backend/src/middleware/upload.js & models/Post.js
const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'mp4',
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'txt',
];

const CATEGORY_LIMITS_MB = {
  image: 5,
  video: 50,
  document: 20,
};

const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_SIZE_MB = 100;
const TAG_PATTERN = /^[a-z0-9][a-z0-9+#._-]*$/;

const POPULAR_TAGS = [
  'algorithms',
  'data-structures',
  'calculus',
  'linear-algebra',
  'machine-learning',
  'operating-systems',
  'physics',
  'chemistry',
  'biology',
];

function getFileCategory(extension) {
  const ext = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (['mp4'].includes(ext)) return 'video';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'].includes(ext)) return 'document';
  return null;
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(['algorithms', 'study-notes']);
  const [attachments, setAttachments] = useState([]); // array of { file, previewUrl, extension, category }

  // Interaction & Submission states
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
    };
  }, [attachments]);

  // Tag Handlers
  const handleAddTag = (tagToAdd) => {
    const clean = tagToAdd
      .trim()
      .replace(/^#+/, '')
      .toLowerCase();

    if (!clean) return;

    if (!TAG_PATTERN.test(clean)) {
      setError(
        `Invalid tag "${clean}". Tags must start with a letter/number and can contain letters, numbers, +, #, ., _, -`
      );
      return;
    }

    if (clean.length > 30) {
      setError(`Tag "${clean}" exceeds the maximum length of 30 characters.`);
      return;
    }

    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }

    if (tags.length >= 10) {
      setError('You can add at most 10 tags to a study post.');
      return;
    }

    setError(null);
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Attachment Handlers & Validation
  const processFiles = (newFilesList) => {
    setError(null);
    const newFiles = Array.from(newFilesList);
    if (!newFiles.length) return;

    if (attachments.length + newFiles.length > MAX_ATTACHMENTS) {
      setError(
        `You can only attach up to ${MAX_ATTACHMENTS} files per post (currently have ${attachments.length}).`
      );
      return;
    }

    const currentTotalBytes = attachments.reduce((sum, a) => sum + a.file.size, 0);
    const newTotalBytes = newFiles.reduce((sum, f) => sum + f.size, 0);

    if (currentTotalBytes + newTotalBytes > MAX_TOTAL_SIZE_MB * 1024 * 1024) {
      setError(
        `Total attachments size cannot exceed ${MAX_TOTAL_SIZE_MB}MB.`
      );
      return;
    }

    const validatedAttachments = [];

    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(
          `File "${file.name}" has an unsupported format. Supported formats: ${ALLOWED_EXTENSIONS.join(
            ', '
          )}`
        );
        return;
      }

      const category = getFileCategory(ext);
      const limitMB = CATEGORY_LIMITS_MB[category] || 10;

      if (file.size > limitMB * 1024 * 1024) {
        setError(
          `File "${file.name}" (${formatBytes(
            file.size
          )}) exceeds the maximum limit of ${limitMB}MB for ${category}s.`
        );
        return;
      }

      const previewUrl = category === 'image' ? URL.createObjectURL(file) : null;
      validatedAttachments.push({
        file,
        previewUrl,
        extension: ext,
        category,
      });
    }

    setAttachments((prev) => [...prev, ...validatedAttachments]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset file input so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments((prev) => {
      const target = prev[indexToRemove];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation matching backend rules
    const errors = {};
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      errors.title = 'Title is required.';
    } else if (cleanTitle.length < 3) {
      errors.title = 'Title must be at least 3 characters.';
    } else if (cleanTitle.length > 150) {
      errors.title = 'Title must be at most 150 characters.';
    }

    // Content is required only if no files are attached
    if (!cleanContent && attachments.length === 0) {
      errors.content =
        'Content is required for text-only posts, or you can attach a file/document.';
    } else if (cleanContent.length > 10000) {
      errors.content = 'Content must be at most 10,000 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      let res;

      if (attachments.length > 0) {
        // Multipart/form-data upload
        const formData = new FormData();
        formData.append('title', cleanTitle);
        if (cleanContent) {
          formData.append('content', cleanContent);
        }
        if (tags.length > 0) {
          formData.append('tags', tags.join(','));
        }
        attachments.forEach((att) => {
          formData.append('attachments', att.file);
        });

        res = await createPost(formData);
      } else {
        // Standard JSON payload
        res = await createPost({
          title: cleanTitle,
          content: cleanContent,
          tags,
        });
      }

      if (res?.success) {
        const post = res.post;
        const status = post?.status || 'published';

        if (status === 'pending_review') {
          setSubmissionFeedback({
            type: 'warning',
            title: 'Submitted for Moderation Review',
            message:
              'Your study post has been submitted and is currently pending review by community moderators before appearing on the public feed.',
          });
          setTimeout(() => navigate('/'), 2500);
        } else if (status === 'removed') {
          setSubmissionFeedback({
            type: 'error',
            title: 'Content Moderation Notice',
            message:
              'Your post could not be published because it violated StudySync community academic guidelines.',
          });
        } else {
          setSubmissionFeedback({
            type: 'success',
            title: 'Post Published Successfully!',
            message:
              'Your study notes are now live on the community feed. Redirecting...',
          });
          setTimeout(() => navigate('/'), 1200);
        }
      } else {
        throw new Error(res?.message || 'Failed to publish post');
      }
    } catch (err) {
      console.error('[Create Post Error]:', err);

      if (err?.details && Array.isArray(err.details)) {
        const mapped = {};
        err.details.forEach((d) => {
          if (d.field) mapped[d.field] = d.message;
        });
        setFieldErrors(mapped);
      }

      setError(
        err?.message ||
          'Failed to publish post. Please verify your fields and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer
      title="Create Study Post"
      subtitle="Share structured study notes, revision cheat sheets, exam practice problems, or academic discussions with peers."
      backTo="/"
      backLabel="Back to Feed"
      maxWidth="narrow"
    >
      {/* Submission Feedback Banner */}
      {submissionFeedback && (
        <Alert
          variant={submissionFeedback.type}
          title={submissionFeedback.title}
          className="shadow-subtle"
        >
          {submissionFeedback.message}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Submission Notice"
          onClose={() => setError(null)}
          className="shadow-subtle"
        >
          {error}
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Field */}
            <Input
              label="Post Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: null }));
                }
              }}
              placeholder="e.g. Complete Guide to Dynamic Programming & Memoization Patterns"
              helperText="Descriptive titles help fellow students find your notes via search."
              maxLength={150}
              error={fieldErrors.title}
              required
            />

            {/* Content Field */}
            <Textarea
              label="Study Content / Problem Walkthrough"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (fieldErrors.content) {
                  setFieldErrors((prev) => ({ ...prev, content: null }));
                }
              }}
              placeholder="Provide clean explanations, code snippets, step-by-step mathematical proofs, or key lecture takeaways..."
              rows={8}
              maxLength={10000}
              error={fieldErrors.content}
              helperText={
                attachments.length > 0
                  ? 'Optional when attachments are included, or use this space to describe the attached files.'
                  : 'Text is required for text-only posts.'
              }
            />

            {/* Academic Topic Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-600" />
                  <span>Topic Tags ({tags.length}/10)</span>
                </label>
                <span className="text-[11px] text-surface-400">
                  Press Enter or comma to add
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-surface-50 border border-surface-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-surface-200 text-xs font-medium text-brand-700 shadow-subtle animate-in fade-in zoom-in-95 duration-100"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="text-surface-400 hover:text-rose-500 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={
                    tags.length < 10
                      ? 'Type topic and press Enter...'
                      : 'Tag limit reached'
                  }
                  disabled={tags.length >= 10}
                  className="flex-1 min-w-[150px] bg-transparent text-xs text-surface-800 placeholder:text-surface-400 focus:outline-none px-2 py-1"
                />
              </div>

              {/* Quick Suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-surface-400">Suggestions:</span>
                {POPULAR_TAGS.filter((pt) => !tags.includes(pt))
                  .slice(0, 5)
                  .map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => handleAddTag(suggested)}
                      className="text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline bg-brand-50/60 px-2 py-0.5 rounded-md transition-colors"
                    >
                      +{suggested}
                    </button>
                  ))}
              </div>
            </div>

            {/* Attachments Dropzone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase flex items-center gap-1.5">
                  <FileUp className="w-3.5 h-3.5 text-brand-600" />
                  <span>Attachments ({attachments.length}/10)</span>
                </label>
                <span className="text-[11px] text-surface-400">
                  PDF, DOCX, PPTX, PNG, JPG, MP4, TXT
                </span>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-attachment-input"
              />

              {/* Dropzone Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 select-none',
                  isDragging
                    ? 'border-brand-500 bg-brand-50/50 scale-[0.99]'
                    : 'border-surface-200/90 hover:border-brand-400 hover:bg-surface-50/70 bg-surface-50/30'
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-surface-200/90 flex items-center justify-center text-brand-600 mx-auto mb-3 shadow-subtle">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-surface-800">
                  Click to upload or drag and drop files here
                </p>
                <p className="text-[11px] text-surface-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Images (up to 5MB), Documents &amp; PDFs (up to 20MB), MP4 Videos (up to 50MB). Total max 100MB.
                </p>
              </div>

              {/* Selected Attachments Preview Grid */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-semibold text-surface-600 uppercase tracking-wide">
                    Ready to Upload ({attachments.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-surface-200 bg-white shadow-subtle group min-w-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Thumbnail / Category Icon */}
                          {att.previewUrl ? (
                            <img
                              src={att.previewUrl}
                              alt={att.file.name}
                              className="w-10 h-10 rounded-lg object-cover border border-surface-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 text-surface-500">
                              {att.category === 'video' ? (
                                <Film className="w-5 h-5 text-purple-600" />
                              ) : att.extension === 'pdf' ? (
                                <FileText className="w-5 h-5 text-rose-600" />
                              ) : (
                                <File className="w-5 h-5 text-brand-600" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-surface-900 truncate">
                              {att.file.name}
                            </p>
                            <p className="text-[10px] text-surface-400 uppercase mt-0.5">
                              {att.extension} &bull; {formatBytes(att.file.size)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(idx);
                          }}
                          aria-label={`Remove attachment ${att.file.name}`}
                          className="p-1 rounded-lg text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={isLoading}
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={isLoading}
                  rightIcon={<Send className="w-4 h-4" />}
                  className="shadow-sm shadow-brand-600/20"
                >
                  {isLoading ? 'Publishing Study Post...' : 'Publish Study Post'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default CreatePostPage;
