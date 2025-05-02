const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ChatifyZone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};

// New function for bulk newsletter sending
const sendNewsletter = async (subject, html, subscribers) => {
  const emails = subscribers.map((sub) => sub.email);
  const BATCH_SIZE = 100; // Adjust based on email service limits

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    await sendEmail(batch.join(','), subject, html);
    // Delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

module.exports = { sendEmail, sendNewsletter };
