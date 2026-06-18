const API = 'https://api.brevo.com/v3/smtp/email';

function getKey() {
  return process.env.BREVO_API_KEY;
}

function baseHtml(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f2ed;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:32px 28px 0;text-align:center;">
        <h1 style="font-family:monospace;font-weight:800;font-size:22px;color:#f0b429;letter-spacing:-.5px;margin:0 0 4px;">
          FOCUS<span style="font-weight:400;font-size:13px;color:#777;display:block;">/ pomodoro + tracker</span></h1>
      </td></tr>
      <tr><td style="padding:24px 28px;font-size:15px;line-height:1.6;color:#333;">
        ${content}
      </td></tr>
      <tr><td style="padding:24px 28px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;">
        FOCUSED — open source productivity suite<br>
        If you didn't request this, you can safely ignore this email.
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

async function send({ email, subject, text, htmlContent, url }) {
  const key = getKey();
  if (!key) {
    console.log(`[EMAIL DEBUG] To: ${email} | Subject: ${subject}`);
    console.log(`[EMAIL DEBUG] ${url || '(no link)'}`);
    return;
  }

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'FOCUSED',
        email: process.env.EMAIL_FROM || 'najmussalahin.adib@gmail.com',
      },
      to: [{ email }],
      subject,
      textContent: text,
      htmlContent: baseHtml(htmlContent),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    console.error(`[EMAIL ERROR] ${err.message || 'Failed to send'}`);
    throw new Error(err.message || 'Failed to send email');
  }
}

exports.sendVerificationEmail = (email, token) => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;
  return send({
    email,
    subject: 'Verify your FOCUSED account',
    text: `Welcome to FOCUSED!\n\nPlease verify your email by clicking this link:\n${url}\n\nThis link expires in 24 hours.`,
    htmlContent: `<p>Welcome to <strong>FOCUSED</strong>!</p>
<p>Please verify your email by clicking the button below:</p>
<p style="text-align:center;margin:24px 0;">
  <a href="${url}" style="display:inline-block;padding:12px 24px;background:#f0b429;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">Verify Email</a>
</p>
<p style="font-size:13px;color:#999;">This link expires in 24 hours.</p>`,
    url,
  });
};

exports.sendPasswordResetEmail = (email, token) => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
  return send({
    email,
    subject: 'Reset your FOCUSED password',
    text: `You requested a password reset for FOCUSED.\n\nClick this link to reset your password:\n${url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.`,
    htmlContent: `<p>You requested a password reset for your <strong>FOCUSED</strong> account.</p>
<p>Click the button below to reset your password:</p>
<p style="text-align:center;margin:24px 0;">
  <a href="${url}" style="display:inline-block;padding:12px 24px;background:#f0b429;color:#1a1a1a;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">Reset Password</a>
</p>
<p style="font-size:13px;color:#999;">This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    url,
  });
};
