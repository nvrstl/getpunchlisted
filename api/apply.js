// Vercel serverless function: receives pilot applications and emails them.
// Required env vars on Vercel:
//   RESEND_API_KEY     — API key from resend.com
//   LEAD_NOTIFY_EMAIL  — comma-separated list of recipients
//   LEAD_FROM_EMAIL    — verified sender (e.g. "Punchlister <pilot@punchlister.com>")
// Optional:
//   LEAD_REPLY_TO      — defaults to applicant's email

const MAX_LEN = { company: 120, name: 120, email: 200, role: 80, message: 2000 };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bad(res, code, message) {
  res.status(code).json({ error: message });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return bad(res, 405, 'Method not allowed');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return bad(res, 400, 'Invalid JSON'); }
  }
  if (!body || typeof body !== 'object') return bad(res, 400, 'Invalid body');

  const company = String(body.company || '').trim().slice(0, MAX_LEN.company);
  const name    = String(body.name    || '').trim().slice(0, MAX_LEN.name);
  const email   = String(body.email   || '').trim().slice(0, MAX_LEN.email);
  const role    = String(body.role    || '').trim().slice(0, MAX_LEN.role);
  const message = String(body.message || '').trim().slice(0, MAX_LEN.message);

  if (!company || !name || !email || !role) return bad(res, 400, 'Missing required fields');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 400, 'Invalid email');

  const apiKey   = process.env.RESEND_API_KEY;
  const toList   = (process.env.LEAD_NOTIFY_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  const fromAddr = process.env.LEAD_FROM_EMAIL || 'Punchlister <onboarding@resend.dev>';
  const replyTo  = process.env.LEAD_REPLY_TO || email;

  if (!apiKey || toList.length === 0) {
    console.error('apply: missing RESEND_API_KEY or LEAD_NOTIFY_EMAIL');
    return bad(res, 500, 'Mail service not configured');
  }

  const subject = `Pilot-aanvraag — ${company} (${name})`;

  const text =
`Nieuwe pilot-aanvraag

Bedrijf:   ${company}
Naam:      ${name}
E-mail:    ${email}
Rol:       ${role}

Boodschap:
${message || '—'}

---
Verstuurd via punchlister.com pilotformulier.`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; color:#1a1240;">
      <h2 style="margin:0 0 16px;font-weight:500;">Nieuwe pilot-aanvraag</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#6b6280;width:120px;">Bedrijf</td><td style="padding:8px 0;"><strong>${escapeHtml(company)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#6b6280;">Naam</td><td style="padding:8px 0;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b6280;">E-mail</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#7c6df0;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:8px 0;color:#6b6280;">Rol</td><td style="padding:8px 0;">${escapeHtml(role)}</td></tr>
      </table>
      ${message ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid #ebe6d9;"><div style="color:#6b6280;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Boodschap</div><div style="white-space:pre-wrap;font-size:14px;line-height:1.5;">${escapeHtml(message)}</div></div>` : ''}
      <p style="margin-top:24px;font-size:12px;color:#6b6280;">Verstuurd via punchlister.com.</p>
    </div>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddr,
        to: toList,
        reply_to: replyTo,
        subject,
        text,
        html
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('resend error', resp.status, errText);
      return bad(res, 502, 'Mail service error');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('apply: send failed', err);
    return bad(res, 500, 'Failed to send');
  }
};
