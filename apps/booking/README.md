# Booking app

One Next.js app for both `book.thevillagesaigon.com` (customers) and `staff.thevillagesaigon.com` (staff), routed by hostname in `src/proxy.ts`. On localhost and Vercel previews the staff app is at `/staff`.

```bash
npm install
npm run dev          # http://localhost:3000 and http://localhost:3000/staff
npm run lint && npm run typecheck && npm test
npm run build && npm run test:e2e
```

Translations: `messages/en.json` and `messages/vi.json` (customer pages only; the staff app is English). The language choice is a cookie, English by default.
Environment variable names: `.env.example`. See the repo's `CLAUDE.md` and `docs/build-plan.md`.
