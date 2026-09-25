






const listingModel = require('../../models/listing.model');
const mlService = require('../../services/mlService');

const CATEGORY_KEYWORDS = {
  Books: ['book', 'textbook', 'novel', 'guide'],
  Laptop: ['laptop', 'notebook pc', 'macbook'],
  Calculator: ['calculator', 'casio', 'fx-'],
  'Drawing Instruments': ['drafter', 'compass box', 'drawing kit'],
  Stationery: ['pen', 'stapler', 'notebook', 'file', 'register'],
  Fan: ['fan', 'table fan'],
  Cooler: ['cooler', 'air cooler'],
  'Hostel Items': ['bucket', 'almirah', 'mattress', 'trunk', 'stand'],
  Electronics: ['charger', 'cable', 'heater', 'extension board', 'adapter'],
};

function guessCategory(text) {
  const textLower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => textLower.includes(kw))) {
      return category;
    }
  }
  return 'Other';
}

function extractPrice(text) {
  const match = text.match(/₹?\s?(\d{2,6})/);
  return match ? parseFloat(match[1]) : null;
}

function extractCondition(text) {
  const textLower = text.toLowerCase();
  if (textLower.includes('like new') || textLower.includes('brand new')) return 5;
  if (textLower.includes('very good')) return 4;
  if (textLower.includes('good')) return 3;
  if (textLower.includes('fair') || textLower.includes('okay')) return 2;
  if (textLower.includes('poor') || textLower.includes('bad') || textLower.includes('old')) return 1;
  return 3;
}


function pythonCapitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

async function runListingAgent(userMessage) {
  const category = guessCategory(userMessage);
  const statedPrice = extractPrice(userMessage);
  const condition = extractCondition(userMessage);

  const basePrice = statedPrice !== null ? statedPrice : 200.0;

  const priceResult = await mlService.predictPrice({
    category,
    originalPrice: basePrice,
    condition,
    monthsUsed: 6,
    demandScore: 0.5,
  });

  const spamResult = await mlService.isSpam(userMessage, '');

  const draftTitle = pythonCapitalize(userMessage.trim()).slice(0, 60);

  const stepsTaken = [
    `🔍 Step 1 — Detected category: **${category}**`,
    `🤖 Step 2 — Ran ML price model → suggested ₹${priceResult.predicted_price}`,
    `🛡️ Step 3 — Ran spam detector → ${spamResult.is_spam ? '⚠️ flagged' : '✅ looks safe'}`,
    '📝 Step 4 — Draft ready for your review',
  ];

  return {
    agent_steps: stepsTaken,
    draft: {
      title: draftTitle,
      category,
      condition,
      listing_type: 'sell',
      suggested_price: priceResult.predicted_price,
      price_range: `₹${priceResult.lower_bound}–₹${priceResult.upper_bound}`,
    },
    spam_check: spamResult,
    summary:
      `I drafted a listing for **${draftTitle}** in **${category}** ` +
      `at **₹${priceResult.predicted_price}** ` +
      `(fair range ₹${priceResult.lower_bound}–₹${priceResult.upper_bound}). ` +
      `${spamResult.is_spam ? '⚠️ This looks like spam, please rephrase.' : 'Looks good — confirm to post it!'}`,
  };
}

function extractMaxPrice(text) {
  const textLower = text.toLowerCase();
  const match = textLower.match(/under\s*₹?\s?(\d{2,6})|below\s*₹?\s?(\d{2,6})|less than\s*₹?\s?(\d{2,6})/);
  if (match) {
    for (let i = 1; i < match.length; i += 1) {
      if (match[i]) return parseFloat(match[i]);
    }
  }
  return null;
}

function extractMinCondition(text) {
  const textLower = text.toLowerCase();
  if (textLower.includes('like new') || textLower.includes('excellent')) return 5;
  if (textLower.includes('good condition')) return 3;
  return 1;
}

async function runSearchAgent(userMessage) {
  const category = guessCategory(userMessage);
  const maxPrice = extractMaxPrice(userMessage);
  const minCondition = extractMinCondition(userMessage);

  
  
  
  
  
  const allActive = await listingModel.findAllActive();

  function applyFilters(listings, { useCategory, useCondition }) {
    return listings.filter((l) => {
      if (useCategory && category !== 'Other' && l.category !== category) return false;
      if (maxPrice && l.price > maxPrice) return false;
      if (useCondition && minCondition > 1 && l.condition < minCondition) return false;
      return true;
    });
  }

  function sortByConditionThenRecency(a, b) {
    if (b.condition !== a.condition) return b.condition - a.condition;
    return new Date(b.created_at) - new Date(a.created_at);
  }

  function sortByRecency(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  }

  let results = applyFilters(allActive, { useCategory: true, useCondition: true })
    .sort(sortByConditionThenRecency)
    .slice(0, 5);

  if (results.length === 0 && category !== 'Other') {
    results = applyFilters(allActive, { useCategory: false, useCondition: false })
      .sort(sortByRecency)
      .slice(0, 5);
  }

  const stepsTaken = [
    `🔍 Step 1 — Detected: category=**${category}**, max_price=**${maxPrice ? `₹${Math.trunc(maxPrice)}` : 'any'}**, min_condition=**${minCondition}/5**`,
    '🗂️ Step 2 — Queried live listings database',
    `📊 Step 3 — Ranked ${results.length} result(s) by condition + recency`,
    '💬 Step 4 — Summary ready',
  ];

  const matches = results.map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    category: r.category,
    condition: r.condition,
    listing_type: r.listing_type,
    image_url: r.image_url,
  }));

  let summary;
  if (matches.length > 0) {
    const top = matches[0];
    summary =
      `I found **${matches.length}** matching listing(s). ` +
      `Best match: **${top.title}** at **₹${top.price}** ` +
      `(condition ${top.condition}/5).`;
  } else {
    summary = "I couldn't find any listings matching that exact request — try widening your price range or browsing all categories.";
  }

  return {
    agent_steps: stepsTaken,
    matches,
    summary,
  };
}

module.exports = {
  guessCategory,
  extractPrice,
  extractCondition,
  extractMaxPrice,
  extractMinCondition,
  runListingAgent,
  runSearchAgent,
};
