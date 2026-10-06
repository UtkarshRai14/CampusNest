const { GoogleGenAI } = require('@google/genai');
const env = require('../../config/env');
const { getContext } = require('./context');
const listingModel = require('../../models/listing.model');
const chatHistoryModel = require('../../models/chatHistory.model');

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });

const GEMINI_MODEL = 'gemini-3.7-flash';
// Without a limit a slow or overloaded Gemini keeps the request open for minutes;
// after this the user gets the fallback reply instead.
const GEMINI_TIMEOUT_MS = 20000;
// Only the latest few turns are sent to Gemini (5 user messages + 5 replies).
const HISTORY_MESSAGES = 10;
const LISTINGS_IN_CONTEXT = 20;

async function getLiveListingsSummary() {
  try {
    const listings = await listingModel.findAllActive();
    if (listings.length === 0) return 'No listings available.';

    let summary = 'LIVE LISTINGS:\n';
    for (const l of listings.slice(0, LISTINGS_IN_CONTEXT)) {
      summary += `- ${l.title} | ${l.category} | ${l.listing_type} | Rs.${l.price}\n`;
    }
    return summary;
  } catch (err) {
    console.error(`ARIA could not load listings: ${err.message}`);
    return 'Listings unavailable.';
  }
}

async function loadHistory(userId) {
  try {
    const rows = await chatHistoryModel.findRecent(userId, HISTORY_MESSAGES);
    // Gemini expects the conversation to begin with a user turn.
    const firstUser = rows.findIndex((r) => r.role === 'user');
    if (firstUser === -1) return [];
    return rows.slice(firstUser).map((r) => ({ role: r.role, parts: [{ text: r.content }] }));
  } catch (err) {
    console.error(`ARIA could not load chat history: ${err.message}`);
    return [];
  }
}

async function saveTurn(userId, userMessage, ariaReply) {
  try {
    await chatHistoryModel.saveTurn(userId, userMessage, ariaReply);
  } catch (err) {
    console.error(`ARIA could not save chat history: ${err.message}`);
  }
}

// Used only when Gemini is unavailable. It never mentions specific items or prices,
// because it has no access to the live listings.
const FALLBACK_REPLIES = [
  [/\b(borrow|lend)\b/, 'You can borrow items from fellow students. Open Browse, choose the Borrow listing type, and message the owner to arrange it.'],
  [/\b(rent|renting)\b/, 'To rent an item, open Browse, choose the Rent listing type, and message the owner to agree on the period and price.'],
  [/\b(sell|selling|post)\b/, 'To sell something, click "+ List Item" in the navbar and follow the 3 steps. On the pricing step you can get an ML-based price estimate.'],
  [/\b(books?|notes|calculators?|laptops?|fans?|coolers?|hostel|bed|stationery|electronics?)\b/, "I can't look up live listings right now. Open Browse and pick the matching category to see what is currently listed."],
  [/\b(hi|hello|hey)\b/, 'Hello! I am ARIA, the CampusNest assistant. Ask me how selling, renting or borrowing works.'],
];
const DEFAULT_FALLBACK = "I'm having trouble answering right now. You can check the Browse page for current listings, or ask me how selling, renting and borrowing work.";

function getFallbackResponse(message) {
  const text = message.toLowerCase();
  const match = FALLBACK_REPLIES.find(([pattern]) => pattern.test(text));
  return match ? match[1] : DEFAULT_FALLBACK;
}

// `user` is the logged-in user, or null for a guest. Only logged-in users get
// conversation memory; guest messages are never stored.
async function chatWithAria(message, user = null) {
  try {
    const liveListings = await getLiveListingsSummary();
    const student = user ? `[Student: ${user.name}, Dept: ${user.department}, Sem: ${user.semester}]\n` : '';
    const currentTurn = `${student}[${liveListings}]\nQuestion: ${message}`;

    const history = user ? await loadHistory(user.id) : [];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [...history, { role: 'user', parts: [{ text: currentTurn }] }],
      config: {
        systemInstruction: getContext(),
        maxOutputTokens: 500,
        httpOptions: { timeout: GEMINI_TIMEOUT_MS },
      },
    });

    const ariaReply = response.text;
    if (!ariaReply) throw new Error('Empty response from Gemini');

    if (user) await saveTurn(user.id, message, ariaReply);
    return ariaReply;
  } catch (err) {
    console.error(`ARIA Error: ${err.message || err}`);
    return getFallbackResponse(message);
  }
}

module.exports = { chatWithAria };
