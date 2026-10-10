const nodemailer = require('nodemailer');
const env = require('../config/env');

function getTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.smtpFrom) {
    throw new Error('SMTP email configuration is incomplete');
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
  });
}

async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await getTransporter().sendMail({
    from: env.smtpFrom,
    to: email,
    subject: 'Verify your CampusNest email',
    text: `Hi ${name},\n\nVerify your CampusNest account by opening this link:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${name},</p><p>Verify your CampusNest account by clicking the link below:</p><p><a href="${verificationUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

module.exports = { sendVerificationEmail };
