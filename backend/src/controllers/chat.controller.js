const chatbotService = require('../services/aria/chatbot.service');
const agentService = require('../services/aria/agent.service');
const chatHistoryModel = require('../models/chatHistory.model');
const { parseText } = require('../utils/validators');

const MAX_MESSAGE_LENGTH = 1000;

function readMessage(req) {
  return parseText((req.body || {}).message, 'Message', { max: MAX_MESSAGE_LENGTH });
}

async function chat(req, res) {
  const response = await chatbotService.chatWithAria(readMessage(req), req.user);
  return res.json({
    response,
    user: req.user.name,
    department: req.user.department,
    semester: req.user.semester,
  });
}

async function chatGuest(req, res) {
  const response = await chatbotService.chatWithAria(readMessage(req));
  return res.json({ response });
}

async function clearHistory(req, res) {
  await chatHistoryModel.deleteForUser(req.user.id);
  return res.json({ message: 'Chat history cleared' });
}

async function chatAgent(req, res) {
  return res.json(await agentService.runListingAgent(readMessage(req)));
}

async function chatAgentSearch(req, res) {
  return res.json(await agentService.runSearchAgent(readMessage(req)));
}

module.exports = { chat, chatGuest, clearHistory, chatAgent, chatAgentSearch };
