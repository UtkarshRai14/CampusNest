const chatbotService = require('../services/aria/chatbot.service');
const agentService = require('../services/aria/agent.service');
const chatHistoryModel = require('../models/chatHistory.model');
const HttpError = require('../utils/HttpError');


async function chat(req, res) {
  const { message } = req.body || {};
  if (!message) throw new HttpError(422, [{ msg: 'message is required' }]);

  const response = await chatbotService.chatWithAria(
    message, req.user.id, req.user.name, req.user.department, req.user.semester
  );
  return res.json({
    response,
    user: req.user.name,
    department: req.user.department,
    semester: req.user.semester,
  });
}


async function chatGuest(req, res) {
  const { message } = req.body || {};
  if (!message) throw new HttpError(422, [{ msg: 'message is required' }]);

  const response = await chatbotService.chatWithAria(message, 0);
  return res.json({ response });
}


async function clearHistory(req, res) {
  await chatHistoryModel.deleteForUser(req.user.id);
  return res.json({ message: 'Chat history cleared' });
}


async function chatAgent(req, res) {
  const { message } = req.body || {};
  if (!message) throw new HttpError(422, [{ msg: 'message is required' }]);

  const result = await agentService.runListingAgent(message);
  return res.json(result);
}






async function chatAgentSearch(req, res) {
  const { message } = req.body || {};
  if (!message) throw new HttpError(422, [{ msg: 'message is required' }]);

  const result = await agentService.runSearchAgent(message);
  return res.json(result);
}

module.exports = { chat, chatGuest, clearHistory, chatAgent, chatAgentSearch };
