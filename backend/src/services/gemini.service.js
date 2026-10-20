/**
 * Gemini AI Service — reusable foundation for all AI features in StudySync.
 *
 * Design principles:
 *  - Single Responsibility: only concerns itself with Gemini API communication.
 *  - Soft-fail: if the API key is absent the server still boots; callers receive
 *    a typed { available: false } sentinel instead of an unhandled exception.
 *  - Structured output: every public helper requests JSON from the model,
 *    parses + validates it, and returns a plain JS object so callers never
 *    touch raw Gemini response objects.
 *
 * Future features that can import from here:
 *  - quiz generation    -> generateStructuredContent('quiz-prompt', schema)
 *  - summarisation      -> generateStructuredContent('summary-prompt', schema)
 *  - keyword extraction -> generateStructuredContent('keyword-prompt', schema)
 *  - content moderation -> generateStructuredContent('moderation-prompt', schema)
 */

'use strict';

const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/** @type {GoogleGenAI | null} */
let _client = null;

/** @type {boolean} */
let _initialised = false;

/**
 * Returns the shared GoogleGenAI client, or null when the API key is absent.
 * Initialisation is attempted only once; result is cached.
 *
 * @returns {GoogleGenAI | null}
 */
function getClient() {
  if (_initialised) return _client;
  _initialised = true;

  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    console.warn(
      '[gemini] GEMINI_API_KEY is not set — AI features are disabled. ' +
        'Add the key to .env to enable them.'
    );
    _client = null;
    return null;
  }

  try {
    _client = new GoogleGenAI({ apiKey });
    console.log('[gemini] Gemini AI client initialised successfully.');
  } catch (err) {
    console.error('[gemini] Failed to initialise Gemini client:', err.message);
    _client = null;
  }

  return _client;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default model used for text/JSON tasks.
 */
const DEFAULT_MODEL = 'gemini-3.8-flash';

/**
 * Regex to strip Markdown code fences Gemini occasionally wraps output in.
 */
const JSON_FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/i;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strips optional Markdown code fences and returns the raw JSON string.
 *
 * @param {string} text
 * @returns {string}
 */
function extractJsonString(text) {
  const trimmed = text.trim();
  const fenced = JSON_FENCE_RE.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parses a string as JSON with a descriptive error on failure.
 *
 * @param {string} raw
 * @returns {unknown}
 * @throws {Error}
 */
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Gemini returned non-JSON output: ' + raw.slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a prompt to Gemini and return a parsed JSON object.
 *
 * @param {string}  prompt
 * @param {object}  [options]
 * @param {string}  [options.model]
 * @param {number}  [options.temperature]
 * @param {number}  [options.maxTokens]
 *
 * @returns {Promise<object>}
 */
async function generateStructuredContent(prompt, options = {}) {
  const client = getClient();
  if (!client) {
    return { available: false, reason: 'AI service is not configured (missing GEMINI_API_KEY).' };
  }

  const model = options.model || DEFAULT_MODEL;

  const generationConfig = {};
  if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
  if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens;

  try {
    const result = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(Object.keys(generationConfig).length ? { generationConfig } : {}),
    });

    const rawText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ??
      result?.text ??
      '';

    if (!rawText) {
      throw new Error('Gemini returned an empty response.');
    }

    const jsonString = extractJsonString(rawText);
    const parsed = parseJson(jsonString);

    return parsed;
  } catch (err) {
    console.error('[gemini] generateStructuredContent error:', err.message);
    return {
      available: false,
      reason: buildUserFacingReason(err),
    };
  }
}

/**
 * Convenience wrapper that appends a JSON-only instruction and calls generateStructuredContent.
 *
 * @param {string}  userPrompt
 * @param {object}  [options]
 * @returns {Promise<object>}
 */
async function generateJson(userPrompt, options = {}) {
  const wrappedPrompt =
    userPrompt + '\n\n' +
    'Respond with valid JSON only. Do NOT include any explanation, markdown, ' +
    'or code fences — output the raw JSON object directly.';

  return generateStructuredContent(wrappedPrompt, options);
}

/**
 * Health-check: returns true if the Gemini client is configured and reachable.
 *
 * @returns {Promise<{ healthy: boolean, model: string, reason?: string }>}
 */
async function checkGeminiHealth() {
  const client = getClient();
  if (!client) {
    return { healthy: false, model: DEFAULT_MODEL, reason: 'API key not configured.' };
  }

  try {
    await client.models.countTokens({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    });
    return { healthy: true, model: DEFAULT_MODEL };
  } catch (err) {
    return { healthy: false, model: DEFAULT_MODEL, reason: buildUserFacingReason(err) };
  }
}

/**
 * Returns true when GEMINI_API_KEY is present in environment.
 *
 * @returns {boolean}
 */
function isGeminiConfigured() {
  return Boolean(env.geminiApiKey);
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/**
 * Maps raw Gemini/network errors to user-friendly reason strings.
 *
 * @param {Error} err
 * @returns {string}
 */
function buildUserFacingReason(err) {
  const msg = (err.message || '').toLowerCase();

  if (msg.includes('api_key') || msg.includes('api key') || msg.includes('401')) {
    return 'Invalid or missing Gemini API key.';
  }
  if (msg.includes('quota') || msg.includes('429') || msg.includes('resource exhausted')) {
    return 'Gemini API quota exceeded. Please try again later.';
  }
  if (msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('temporarily')) {
    return 'The Gemini AI service is temporarily overloaded. Please try again in a moment.';
  }
  if (msg.includes('network') || msg.includes('enotfound') || msg.includes('econnrefused')) {
    return 'Unable to reach the Gemini API. Check your internet connection.';
  }
  if (msg.includes('non-json')) {
    return 'The AI returned an unexpected response format.';
  }
  if (msg.includes('safety') || msg.includes('blocked')) {
    return 'The request was blocked by Gemini safety filters.';
  }

  return 'The AI service encountered an unexpected error. Please try again.';
}

module.exports = {
  generateStructuredContent,
  generateJson,
  checkGeminiHealth,
  isGeminiConfigured,
};
