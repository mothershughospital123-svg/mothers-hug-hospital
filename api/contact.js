const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { firstName, email, message } = req.body || {};

  if (!firstName || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("Contact form SMTP env vars are not configured.");
    return res.status(500).json({ error: "Email is not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Mother's Hug Hospital Website" <${SMTP_USER}>`,
      to: CONTACT_TO || "contact@mothershughospital.com",
      replyTo: email,
      subject: `New website inquiry from ${firstName}`,
      text: `Name: ${firstName}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${firstName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${String(message).replace(/\n/g, "<br>")}</p>`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Failed to send contact email:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};
