const { GoogleGenAI } = require('@google/genai');
const env = require('../../config/env');
const { getContext } = require('./context');
const listingModel = require('../../models/listing.model');
const chatHistoryModel = require('../../models/chatHistory.model');

const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });





async function getLiveListingsSummary() {
  try {
    const listings = await listingModel.findAllActive();
    const first20 = listings.slice(0, 20);
    if (first20.length === 0) {
      return 'No listings available.';
    }
    let summary = 'LIVE LISTINGS:\n';
    for (const l of first20) {
      summary += `- ${l.title} | ${l.category} | ${l.listing_type} | Rs.${l.price}\n`;
    }
    return summary;
  } catch (err) {
    return 'Listings unavailable.';
  }
}


async function saveMessage(userId, role, msgContent) {
  try {
    await chatHistoryModel.save(userId, role, msgContent);
  } catch (err) {
    
  }
}


function getFallbackResponse(message) {
  const msg = message.toLowerCase();
  if (msg.includes('borrow')) {
    return 'Borrow items from fellow IIIT Sonepat students temporarily! Browse Borrow listings and contact the seller.';
  }
  if (msg.includes('calculator') || msg.includes('casio')) {
    return 'Casio fx-991ES PLUS available to borrow for Rs.100/day! Check Calculator category.';
  }
  if (msg.includes('book') || msg.includes('notes')) {
    return 'Books available: Engineering Maths Rs.130, CS Books Rs.800, GATE Papers Rs.400. Browse Books!';
  }
  if (msg.includes('laptop')) {
    return 'HP Laptop available to borrow for Rs.200/day. Check Laptop category!';
  }
  if (msg.includes('hostel') || msg.includes('fan') || msg.includes('cooler') || msg.includes('bed')) {
    return 'Hostel Items: Bed Rs.1500, Almirah Rs.2400, Fan Rs.600, Cooler rent Rs.500/month!';
  }
  if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
    return 'Hello! I am ARIA your IIIT Sonepat Campus AI. Ask me about listings, prices, or features!';
  }
  if (msg.includes('sell') || msg.includes('post')) {
    return 'Click + List Item in navbar, fill 3 steps, AI suggests price, go live instantly!';
  }
  return 'I am ARIA! Ask me: What books are available? How does borrowing work? Show hostel items?';
}






async function chatWithAria(message, userId, userName = null, userDepartment = null, userSemester = null) {
  try {
    const liveListings = await getLiveListingsSummary();
    const context = `Student: ${userName}, Dept: ${userDepartment}, Sem: ${userSemester}`;
    const fullMessage = `[${context}]\n[${liveListings}]\nQuestion: ${message}`;

    await saveMessage(userId, 'user', message);

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: fullMessage,
      config: {
        systemInstruction: getContext(),
        maxOutputTokens: 500,
      },
    });
    const ariaResponse = response.text;

    await saveMessage(userId, 'model', ariaResponse);
    return ariaResponse;
  } catch (err) {
    
    console.error(`ARIA Error: ${err.message || err}`);
    return getFallbackResponse(message);
  }
}

module.exports = { chatWithAria, getFallbackResponse, getLiveListingsSummary };
