# Stage 2 brief for Claude in Chrome

Paste everything below the line into Claude in Chrome. You (the owner) stay at the keyboard: you type card details, passwords and two-factor codes yourself, and you click any "verify your email" links.

---

Please help me set up the accounts for our booking system, **The Village - Family Club** (Saigon). Go to each site in order, guide me through sign-up, and fill in the non-sensitive fields. Rules:

- **Never type card details, passwords, two-factor codes or API keys.** Stop and ask me to do those.
- **Before any step that charges money, stop and tell me the plan and the price,** and wait for my "yes".
- Don't change DNS records, delete anything, or accept extra paid add-ons.
- When a key or token is shown, **don't read it out or copy it anywhere.** Tell me to copy it myself (see step 6).
- Use our business name "The Village" and my email address for every account, and turn on two-factor login wherever it's offered.

**1. Domain and email: namecheap.com**
- Search for `thevillagesaigon.com` and add it to the cart (1 year is fine; auto-renew on).
- Add **Private Email, Starter/"Launch" plan, 1 mailbox** for `hello@thevillagesaigon.com` (about $15/year after the free first month).
- Skip other add-ons (SSL, hosting, premium DNS). Domain privacy (free) is fine.
- Stop for me to pay. After purchase: turn on **Registrar lock** for the domain. Don't touch "Advanced DNS".

**2. Supabase: supabase.com** (database)
- Sign up (GitHub sign-in is fine), then create an **organisation** called "The Village" on the **Pro plan** (stop for me to pay).
- **Don't create any projects**: our developer creates them so the region and settings are right.
- Then: Account (top-right) → Access Tokens → "Generate new token", name it `claude-build`. Stop and tell me to copy it (step 6).

**3. Vercel: vercel.com** (hosting)
- Sign up with GitHub (account `jackkimber-ops`), create a team called "The Village" on the **Pro plan** (stop for me to pay).
- Settings → Billing: set a **spend limit with email alerts** (suggest $50/month).
- Don't import any project yet.
- Then: Account Settings → Tokens → create a token named `claude-build`, scope "The Village" team, no expiry or 1 year. Stop and tell me to copy it (step 6).

**4. Resend: resend.com** (emails)
- Sign up, choose the **Pro plan** (stop for me to pay).
- Don't add the domain yet (our developer does that with the DNS records).
- API Keys → create a key named `claude-build` with **Full access**. Stop and tell me to copy it (step 6).

**5. Done in the browser.** Summarise what was created and anything that's still waiting (e.g. email verification).

**6. Keys go into the Claude Code environment, not into any chat.** I'll do this myself in the Claude app: the cloud environment menu in the session's title bar → Edit →
- **Network secrets** (or environment variables): `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `RESEND_API_KEY`
- **Network access → Allowed domains:** `api.vercel.com`, `api.supabase.com`, `*.supabase.co`, `api.resend.com`
- Then start a new Claude Code session so it picks them up.
