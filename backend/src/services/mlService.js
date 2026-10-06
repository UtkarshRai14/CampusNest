const env = require('../config/env');
const HttpError = require('../utils/HttpError');

const REQUEST_TIMEOUT_MS = 10000;

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(`${env.mlServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new HttpError(503, 'ML service is unavailable');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) {
      throw new HttpError(400, typeof data.detail === 'string' ? data.detail : 'Invalid input for the ML service');
    }
    throw new HttpError(502, 'ML service request failed');
  }
  return data;
}

async function predictPrice({ category, originalPrice, condition, monthsUsed, demandScore = 0.5 }) {
  return postJson('/predict/price', {
    category,
    original_price: originalPrice,
    condition,
    months_used: monthsUsed,
    demand_score: demandScore,
  });
}

async function isSpam(title, description = '') {
  return postJson('/predict/spam', { title, description });
}

// One request for many listings, so a listings page needs a single ML call.
async function isSpamBatch(items) {
  if (items.length === 0) return [];
  const { results } = await postJson('/predict/spam/batch', { items });
  return results;
}

module.exports = { predictPrice, isSpam, isSpamBatch };
