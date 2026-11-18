// Emails sent from anywhere but the live site (staging, previews, a laptop) are marked as tests (Jack, 18 Nov):
// a test booking on staging emailed hello@ and looked like a real customer. Live (VERCEL_ENV=production) is unchanged.

const BANNER_EN = "TEST SITE: not a real booking. This email came from the test site; nothing needs doing.";
const BANNER_VI = "TRANG THỬ NGHIỆM: không phải đặt chỗ thật.";

export function isLive(env = process.env.VERCEL_ENV) {
  return env === "production";
}

export function markTest<T extends { from?: string; subject: string; html?: string; text?: string }>(m: T, env = process.env.VERCEL_ENV): T {
  if (isLive(env) || m.subject.startsWith("[TEST] ")) return m; // live, or already marked
  const banner = `<div style="background:#ffd84d;color:#1a1a1a;border:3px solid #c0392b;padding:12px 16px;margin:0 0 16px;font:700 15px/1.4 Arial,sans-serif;text-align:center">${BANNER_EN}<br><span style="font-weight:400">${BANNER_VI}</span></div>`;
  const html = m.html === undefined ? undefined
    : /<body[^>]*>/i.test(m.html) ? m.html.replace(/<body[^>]*>/i, (b) => b + banner) : banner + m.html;
  // "The Village <bookings@…>" -> "The Village (TEST) <bookings@…>"; a bare address gets a name.
  const from = m.from === undefined ? m.from
    : /^(.*?)\s*<(.+)>$/.test(m.from) ? m.from.replace(/^(.*?)\s*<(.+)>$/, (_, name, addr) => `${name.replace(/"/g, "") || "The Village"} (TEST) <${addr}>`)
    : `The Village (TEST) <${m.from}>`;
  return {
    ...m,
    from,
    subject: `[TEST] ${m.subject}`,
    html,
    text: m.text === undefined ? undefined : `*** ${BANNER_EN} ***\n\n${m.text}`,
  };
}
