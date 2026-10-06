const listingModel = require('../../models/listing.model');
const mlService = require('../mlService');

// This agent is rule-based: regular expressions and keyword lists pull details out of the
// message, the ML service estimates a price and spam risk, and the user confirms the draft.

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

const LISTING_TYPE_KEYWORDS = {
  sell: ['sell', 'selling', 'sale'],
  rent: ['rent', 'renting', 'rental'],
  borrow: ['borrow', 'lend', 'lending'],
  swap: ['swap', 'exchange', 'trade'],
};

// The price model has no "Other" category, so no estimate can be made for it.
const UNKNOWN_CATEGORY = 'Other';
const DEFAULT_MONTHS_USED = 6;

function containsWord(text, word) {
  return new RegExp(`\\b${word}s?\\b`, 'i').test(text);
}

function guessCategory(text) {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => containsWord(text, kw))) return category;
  }
  return UNKNOWN_CATEGORY;
}

function guessListingType(text) {
  for (const [type, keywords] of Object.entries(LISTING_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => containsWord(text, kw))) return type;
  }
  return 'sell';
}

function toAmount(raw) {
  return parseFloat(raw.replace(/,/g, ''));
}

// The number in the message is used as the item's original purchase price, because that is
// what the price model needs. Prefers "bought for 1500" / "₹1500" over a bare number.
function extractPrice(text) {
  const marked = text.match(/(?:bought|purchased|original(?:\s+price)?|mrp)\D{0,15}?(\d[\d,]{1,6})/i)
    || text.match(/(?:₹|rs\.?\s?|inr\s?)(\d[\d,]{1,6})/i)
    || text.match(/(\d[\d,]{1,6})\s?(?:rs\b|rupees?|₹)/i);
  if (marked) return toAmount(marked[1]);

  const bare = text.match(/(?<![\w-])(\d{2,6})(?![\w-])(?!\s*(?:months?|mos?|years?|yrs?)\b)/i);
  return bare ? toAmount(bare[1]) : null;
}

function extractMonthsUsed(text) {
  const months = text.match(/(\d{1,3})\s*(?:months?|mos?)\b/i);
  if (months) return parseInt(months[1], 10);
  const years = text.match(/(\d{1,2})\s*(?:years?|yrs?)\b/i);
  return years ? parseInt(years[1], 10) * 12 : null;
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

// "sell my calculator, good condition, bought for 1500" -> "Calculator"
function buildTitle(message) {
  const item = message
    .replace(/^\s*(?:i\s+(?:want|wanna|would like)\s+to\s+|please\s+)?(?:sell(?:ing)?|rent(?:ing)?(?:\s+out)?|lend(?:ing)?|borrow(?:ing)?|swap(?:ping)?|exchange|trade)\s+(?:my\s+|a\s+|an\s+|the\s+)?/i, '')
    .split(/[,.;]|\s(?:for|at|bought|purchased|in|used)\s/i)[0]
    .trim();
  const title = (item || message.trim()).slice(0, 60);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const formatRange = (lower, upper) => `₹${Math.round(lower)}–₹${Math.round(upper)}`;

async function runListingAgent(userMessage) {
  const category = guessCategory(userMessage);
  const listingType = guessListingType(userMessage);
  const condition = extractCondition(userMessage);
  const originalPrice = extractPrice(userMessage);
  const statedMonths = extractMonthsUsed(userMessage);
  const monthsUsed = statedMonths !== null ? statedMonths : DEFAULT_MONTHS_USED;

  const steps = [
    `🔍 Step 1 — Detected: category ${category}, type ${listingType}, condition ${condition}/5`,
  ];

  if (category === UNKNOWN_CATEGORY || originalPrice === null) {
    steps.push('⏸️ Step 2 — Price model skipped, not enough information');
    return {
      agent_steps: steps,
      draft: null,
      spam_check: null,
      summary: category === UNKNOWN_CATEGORY
        ? "I couldn't tell which category this item belongs to, so I can't estimate a price. Mention what it is (for example calculator, laptop or book) and its original price."
        : "I need the item's original price to estimate a fair price. Try something like: sell my calculator, good condition, bought for 1500 rupees.",
    };
  }

  const priceResult = await mlService.predictPrice({
    category,
    originalPrice,
    condition,
    monthsUsed,
    demandScore: 0.5,
  });
  const spamResult = await mlService.isSpam(userMessage, '');
  const suggestedPrice = Math.round(priceResult.predicted_price);

  const monthsNote = statedMonths !== null ? `${monthsUsed} months used` : `assumed ${monthsUsed} months used`;
  steps.push(
    `🤖 Step 2 — ML price model (original price ₹${originalPrice}, ${monthsNote}) → estimate ₹${suggestedPrice}`,
    `🛡️ Step 3 — Spam check → ${spamResult.is_spam ? '⚠️ flagged' : '✅ not flagged'}`
  );

  if (spamResult.is_spam) {
    return {
      agent_steps: steps,
      draft: null,
      spam_check: spamResult,
      summary: 'This looks like spam, so I did not create a draft. Please rephrase your request.',
    };
  }

  steps.push('📝 Step 4 — Draft ready for your review');
  const title = buildTitle(userMessage);
  const range = formatRange(priceResult.lower_bound, priceResult.upper_bound);
  const priceNote = listingType === 'sell'
    ? ''
    : ' This is an estimated resale value, so adjust the price for a rent, borrow or swap listing after posting (Profile → My Listings → Edit).';

  return {
    agent_steps: steps,
    draft: {
      title,
      category,
      condition,
      listing_type: listingType,
      original_price: originalPrice,
      months_used: monthsUsed,
      suggested_price: suggestedPrice,
      price_range: range,
    },
    spam_check: spamResult,
    summary:
      `I drafted a ${listingType} listing for "${title}" in ${category} at ₹${suggestedPrice} ` +
      `(estimated range ${range}). Confirm to post it.${priceNote}`,
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
      if (useCategory && category !== UNKNOWN_CATEGORY && l.category !== category) return false;
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

  if (results.length === 0 && category !== UNKNOWN_CATEGORY) {
    results = applyFilters(allActive, { useCategory: false, useCondition: false })
      .sort(sortByRecency)
      .slice(0, 5);
  }

  const stepsTaken = [
    `🔍 Step 1 — Detected: category ${category}, max price ${maxPrice ? `₹${Math.trunc(maxPrice)}` : 'any'}, min condition ${minCondition}/5`,
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
      `I found ${matches.length} matching listing(s). ` +
      `Best match: ${top.title} at ₹${top.price} ` +
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

module.exports = { runListingAgent, runSearchAgent };
