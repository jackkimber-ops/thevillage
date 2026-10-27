import "server-only";
import { timingSafeEqual } from "node:crypto";
import { checkBotId } from "botid/server";
import { cookies } from "next/headers";

/**
 * Vercel BotID (invisible, no widget) for the login and guest booking forms.
 * Only runs on Vercel: locally and in CI there is no BotID service to ask.
 * If BotID itself fails we let the request through, so an outage can't lock customers out;
 * Supabase's email rate limit still applies.
 */
export async function isBot(): Promise<boolean> {
  if (process.env.VERCEL !== "1") return false;
  if (await isQaCheck()) return false;
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.error("BotID check failed, letting the request through", e);
    return false;
  }
}

/**
 * The automated staging check (e2e-staging) is a robot by design. QA_BYPASS_TOKEN is set only for
 * the staging branch on Vercel, never in production; the check sends it as a cookie.
 */
async function isQaCheck(): Promise<boolean> {
  const token = process.env.QA_BYPASS_TOKEN;
  if (!token || process.env.VERCEL_ENV === "production") return false;
  const sent = (await cookies()).get("qa-bypass")?.value ?? "";
  return sent.length === token.length && timingSafeEqual(Buffer.from(sent), Buffer.from(token));
}
