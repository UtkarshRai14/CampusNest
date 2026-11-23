function sanitizeAutomaticReply(content, { isSellerMessage, shareEmail, shareWhatsapp }) {
  if (!isSellerMessage || typeof content !== 'string' || !content.includes('(This is an automatic reply.)')) return content;
  let safeContent = content;
  if (!shareEmail) safeContent = safeContent.replace(/Email:\s*[^\r\n]*/i, 'Email: (not shared)');
  if (!shareWhatsapp) safeContent = safeContent.replace(/\r?\n[^\r\n]*WhatsApp:\s*[^\r\n]*/i, '');
  return safeContent;
}

module.exports = { sanitizeAutomaticReply };
