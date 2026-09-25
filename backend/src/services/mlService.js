const env = require('../config/env');








async function postJson(path, body) {
  const res = await fetch(`${env.mlServiceUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.detail || 'ML service request failed');
    error.status = res.status;
    error.detail = data.detail;
    throw error;
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







async function isSpamBatch(items) {
  if (items.length === 0) return [];
  const { results } = await postJson('/predict/spam/batch', { items });
  return results;
}

module.exports = { predictPrice, isSpam, isSpamBatch };
