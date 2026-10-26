import "server-only";
import { checkBotId } from "botid/server";

/**
 * Vercel BotID (invisible, no widget) for the login and guest booking forms.
 * Only runs on Vercel: locally and in CI there is no BotID service to ask.
 * If BotID itself fails we let the request through, so an outage can't lock customers out;
 * Supabase's email rate limit still applies.
 */
export async function isBot(): Promise<boolean> {
  if (process.env.VERCEL !== "1") return false;
  try {
    return (await checkBotId()).isBot;
  } catch (e) {
    console.error("BotID check failed, letting the request through", e);
    return false;
  }
}
