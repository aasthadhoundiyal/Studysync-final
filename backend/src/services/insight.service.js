/**
 * Insight Service — generates and caches AI summaries and keyword lists for posts.
 *
 * Both features share:
 *   - The same PostInsight model (one document per post)
 *   - The same access-control pattern as quiz.service
 *   - The same gemini.service generateJson() call + retry strategy
 *   - A 24-hour cache with staleness detection on title + content length
 *
 * Flow for each feature:
 *   1. Load post, verify visibility.
 *   2. Check PostInsight cache for freshness.
 *   3. If stale or force=true, call Gemini and validate response.
 *   4. Upsert only the relevant sub-document field.
 *   5. Return serialized result + cached flag.
 */
'use strict';

const Post = require('../models/Post');
const PostInsight = require('../models/PostInsight');
const ApiError = require('../utils/ApiError');
const { generateJson, isGeminiConfigured } = require('./gemini.service');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Truncate text to a safe prompt length. */
function truncate(text, maxChars = 4000) {
  if (!text) return '';
  return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
}

/**
 * Loads the post and enforces visibility rules (mirrors quiz.service).
 * Returns the lean post doc or throws ApiError.
 */
async function loadVisiblePost(postId, viewer) {
  const post = await Post.findById(postId)
    .select('title content tags status author')
    .lean();

  if (!post) throw ApiError.notFound('Post not found');

  if (post.status !== 'published') {
    const isOwner =
      viewer && post.author && post.author.toString() === viewer._id.toString();
    const isAdmin = viewer && viewer.role === 'admin';
    if (!isOwner && !isAdmin) throw ApiError.notFound('Post not found');
  }

  return post;
}

/**
 * Guards against empty content: if both title and content are blank the AI
 * has nothing to work with.
 */
function assertHasContent(post) {
  const combined = ((post.title || '') + (post.content || '')).trim();
  if (!combined) {
    throw new ApiError(422, 'This post has no content to analyse.');
  }
}

/** Checks whether a sub-document cache entry is still fresh. */
function isFresh(snapshot, post, ttlMs) {
  if (!snapshot || !snapshot.generatedAt) return false;
  const age = Date.now() - new Date(snapshot.generatedAt).getTime();
  if (age > ttlMs) return false;
  if (snapshot.titleSnapshot !== post.title) return false;
  if (snapshot.contentLengthSnapshot !== (post.content || '').length) return false;
  return true;
}

/**
 * Calls generateJson with a single automatic retry on transient 503 errors.
 * Re-used by both summary and keywords generation.
 */
async function callGeminiWithRetry(prompt, options = {}) {
  let raw = await generateJson(prompt, options);

  if (raw && raw.available === false) {
    const reason = (raw.reason || '').toLowerCase();
    const isTransient =
      reason.includes('overloaded') ||
      reason.includes('temporarily') ||
      reason.includes('demand') ||
      reason.includes('unavailable');
    if (isTransient) {
      console.log('[insight] Gemini transient error, retrying in 4s...');
      await new Promise((r) => setTimeout(r, 4000));
      raw = await generateJson(prompt, options);
    }
  }

  if (raw && raw.available === false) {
    throw new ApiError(503, raw.reason || 'AI service is currently unavailable.');
  }

  return raw;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function buildSummaryPrompt(post) {
  const tagLine = post.tags && post.tags.length ? post.tags.join(', ') : 'general';
  const content = truncate(post.content, 4000);

  return (
    'You are an expert educational content summariser.\n' +
    'Write a concise, informative summary of the following study post.\n\n' +
    '--- POST START ---\n' +
    'Title: ' + post.title + '\n' +
    'Tags: ' + tagLine + '\n' +
    'Content:\n' + content + '\n' +
    '--- POST END ---\n\n' +
    'Rules:\n' +
    '- The summary must be 3 to 6 sentences long.\n' +
    '- Use clear, simple language suitable for students.\n' +
    '- Capture the main concepts, key points, and purpose of the post.\n' +
    '- Do NOT add information not present in the post.\n' +
    '- Do NOT start with "This post..." or "The post...".\n\n' +
    'Return ONLY a raw JSON object in this exact shape:\n' +
    '{ "summary": "string" }'
  );
}

/**
 * Validates the Gemini summary response.
 * @param {unknown} raw
 * @returns {string} The summary text.
 */
function validateSummaryResponse(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.summary !== 'string') {
    throw new ApiError(502, 'AI returned an unexpected summary structure. Please try again.');
  }
  const text = raw.summary.trim();
  if (!text) {
    throw new ApiError(502, 'AI returned an empty summary. Please try again.');
  }
  if (text.length > 2000) {
    throw new ApiError(502, 'AI summary is too long. Please try again.');
  }
  return text;
}

/**
 * Get or generate a summary for a post.
 *
 * @param {string}  postId
 * @param {object}  viewer
 * @param {boolean} [force]
 * @returns {Promise<{ summary: string, generatedAt: Date, cached: boolean }>}
 */
async function getOrGenerateSummary(postId, viewer, force = false) {
  if (!isGeminiConfigured()) {
    throw new ApiError(503, 'AI study features are temporarily unavailable. Please try again later.');
  }

  const post = await loadVisiblePost(postId, viewer);
  assertHasContent(post);

  const ttl = PostInsight.CACHE_TTL_MS;

  // --- Cache check ---
  if (!force) {
    const existing = await PostInsight.findOne({ post: postId }).lean();
    if (existing && isFresh(existing.summary, post, ttl)) {
      return {
        summary: existing.summary.text,
        generatedAt: existing.summary.generatedAt,
        cached: true,
      };
    }
  }

  // --- Generate ---
  const prompt = buildSummaryPrompt(post);
  const raw = await callGeminiWithRetry(prompt, { temperature: 0.3, maxTokens: 1024 });
  const summaryText = validateSummaryResponse(raw);

  const now = new Date();
  await PostInsight.findOneAndUpdate(
    { post: postId },
    {
      $set: {
        'summary.text': summaryText,
        'summary.generatedAt': now,
        'summary.titleSnapshot': post.title,
        'summary.contentLengthSnapshot': (post.content || '').length,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return { summary: summaryText, generatedAt: now, cached: false };
}

/**
 * Delete the cached summary for a post (author / admin only).
 *
 * @param {string} postId
 * @param {object} requester
 */
async function deleteSummary(postId, requester) {
  const post = await Post.findById(postId).select('author').lean();
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = post.author && post.author.toString() === requester._id.toString();
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You do not have permission to delete this summary');

  await PostInsight.findOneAndUpdate(
    { post: postId },
    { $set: { 'summary.text': '', 'summary.generatedAt': null } }
  );
  return { postId };
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

function buildKeywordsPrompt(post) {
  const tagLine = post.tags && post.tags.length ? post.tags.join(', ') : 'general';
  const content = truncate(post.content, 4000);

  return (
    'You are an expert educational content analyst.\n' +
    'Extract the most important keywords and topics from the following study post.\n\n' +
    '--- POST START ---\n' +
    'Title: ' + post.title + '\n' +
    'Tags: ' + tagLine + '\n' +
    'Content:\n' + content + '\n' +
    '--- POST END ---\n\n' +
    'Rules:\n' +
    '- Extract between 5 and 20 keywords or key phrases.\n' +
    '- Include important concepts, technical terms, named entities, and core topics.\n' +
    '- Each keyword must be a short phrase (1–4 words), lowercase, no punctuation.\n' +
    '- Do NOT include generic words like "the", "a", "this post", "content".\n' +
    '- Do NOT repeat similar keywords.\n' +
    '- Keywords must come from the post content only.\n\n' +
    'Return ONLY a raw JSON object in this exact shape:\n' +
    '{ "keywords": ["string", "string", ...] }'
  );
}

/**
 * Validates the Gemini keywords response.
 * @param {unknown} raw
 * @returns {string[]} Cleaned keyword array.
 */
function validateKeywordsResponse(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.keywords)) {
    throw new ApiError(502, 'AI returned an unexpected keywords structure. Please try again.');
  }

  const { keywords } = raw;

  if (keywords.length < 3 || keywords.length > 25) {
    throw new ApiError(502, 'AI returned an invalid number of keywords. Please try again.');
  }

  const cleaned = keywords
    .filter((k) => typeof k === 'string' && k.trim())
    .map((k) => k.trim().toLowerCase().slice(0, 100));

  if (cleaned.length < 3) {
    throw new ApiError(502, 'AI returned too few valid keywords. Please try again.');
  }

  return [...new Set(cleaned)]; // deduplicate
}

/**
 * Get or generate keywords for a post.
 *
 * @param {string}  postId
 * @param {object}  viewer
 * @param {boolean} [force]
 * @returns {Promise<{ keywords: string[], generatedAt: Date, cached: boolean }>}
 */
async function getOrGenerateKeywords(postId, viewer, force = false) {
  if (!isGeminiConfigured()) {
    throw new ApiError(503, 'AI study features are temporarily unavailable. Please try again later.');
  }

  const post = await loadVisiblePost(postId, viewer);
  assertHasContent(post);

  const ttl = PostInsight.CACHE_TTL_MS;

  // --- Cache check ---
  if (!force) {
    const existing = await PostInsight.findOne({ post: postId }).lean();
    if (existing && isFresh(existing.keywords, post, ttl)) {
      return {
        keywords: existing.keywords.list,
        generatedAt: existing.keywords.generatedAt,
        cached: true,
      };
    }
  }

  // --- Generate ---
  const prompt = buildKeywordsPrompt(post);
  const raw = await callGeminiWithRetry(prompt, { temperature: 0.2, maxTokens: 512 });
  const keywordList = validateKeywordsResponse(raw);

  const now = new Date();
  await PostInsight.findOneAndUpdate(
    { post: postId },
    {
      $set: {
        'keywords.list': keywordList,
        'keywords.generatedAt': now,
        'keywords.titleSnapshot': post.title,
        'keywords.contentLengthSnapshot': (post.content || '').length,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  return { keywords: keywordList, generatedAt: now, cached: false };
}

/**
 * Delete the cached keywords for a post (author / admin only).
 *
 * @param {string} postId
 * @param {object} requester
 */
async function deleteKeywords(postId, requester) {
  const post = await Post.findById(postId).select('author').lean();
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = post.author && post.author.toString() === requester._id.toString();
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You do not have permission to delete these keywords');

  await PostInsight.findOneAndUpdate(
    { post: postId },
    { $set: { 'keywords.list': [], 'keywords.generatedAt': null } }
  );
  return { postId };
}

module.exports = {
  getOrGenerateSummary,
  deleteSummary,
  getOrGenerateKeywords,
  deleteKeywords,
};
