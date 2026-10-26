# Owner checklist: accounts and purchases

Only the owners can do these. Open every account **in The Village's name with an owner's email**, turn on **MFA**, then invite the developer.
Nothing here is needed until the designs are signed off, **except** Meta/Zalo verification and the domain, which take time, so start those now.

## Start now (slow approvals)

- [ ] **Domain:** buy `thevillagesaigon.com` (about $10–20/year) and turn on the **registrar lock**. I'll add the DNS records (email SPF/DKIM/DMARC, Vercel) later.
- [ ] **Meta (WhatsApp):** create a Meta Business Portfolio at business.facebook.com and start business verification (company registration certificate + website or domain email). This can take days or weeks.
- [ ] **Zalo:** create a Zalo Official Account at oa.zalo.me and start verification (business licence). Verified tiers are paid. Ask me before buying one.
- [ ] **SMS sender name (after registration, optional):** register a text-message sender name (up to 11 characters, e.g. "TheVillage") with an SMS provider. Vietnam blocks business texts from unregistered senders, and registration needs the stamped business registration certificate. Approval can take days to months, and every text costs money. Only needed if we want SMS login codes or reminders as well as email/Zalo/WhatsApp. Ask me before signing up.
- [ ] **Google Business Profile** (W2), as soon as the address is final.
- [x] **GitHub:** decided 25 Oct: the repo stays under `jackkimber-ops` (no organisation needed).

## After design sign-off (paid, about $76–87/month in total)

| Account | Plan | Monthly (USD) | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | 1 developer seat included; owners don't need seats. Turn on a spend limit with alerts |
| Supabase | Pro (production) | $25 | Region Singapore. Daily backups, 7 days |
| Supabase | Staging project (Micro) | $10 | Same organisation |
| Resend | Pro | $20 | Sends from an address on the domain |
| Domain | — | about $1–2 | See above |
| WhatsApp / Zalo / SMS | pay per message | about $0–10 | Once approved |

Email inbox (decided 21 Oct): **Namecheap Private Email, Launch plan** (1 mailbox, about $15/year after the free first month): **hello@thevillagesaigon.com**, plus free aliases such as bookings@ and privacy@ that deliver into it. Buy it in the same Namecheap account as the domain, and don't edit the DNS records yourselves: Claude sets up the email records and Resend's together so neither lands in spam.

Optional: Supabase through the Vercel Marketplace (one bill). Check that daily backups and Pro limits are included first. 

Free accounts I'll ask you to open or approve later: Sentry, an uptime monitor, Cloudflare Turnstile.
