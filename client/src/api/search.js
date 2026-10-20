import api from './client';

/**
 * Unified or type-specific search
 * GET /api/search
 * Params: { q, type: 'all'|'posts'|'users'|'tags', sort: 'relevance'|'newest'|'oldest'|'trending', tag, page, limit }
 */
export async function search(params = {}) {
  return api.get('/search', params);
}

/**
 * Dedicated post search
 * GET /api/search/posts
 * Params: { q, sort: 'relevance'|'newest'|'oldest'|'trending', tag, page, limit }
 */
export async function searchPosts(params = {}) {
  return api.get('/search/posts', params);
}

/**
 * Dedicated user search
 * GET /api/search/users
 * Params: { q, page, limit }
 */
export async function searchUsers(params = {}) {
  return api.get('/search/users', params);
}

/**
 * Dedicated tag search / tag browsing
 * GET /api/search/tags
 * Params: { q, page, limit }
 */
export async function searchTags(params = {}) {
  return api.get('/search/tags', params);
}

export default {
  search,
  searchPosts,
  searchUsers,
  searchTags,
};
