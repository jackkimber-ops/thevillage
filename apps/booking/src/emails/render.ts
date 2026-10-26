import { render } from "@react-email/render";
import { CustomerEmail, plainText, subjectFor } from "./CustomerEmail";
import type { EmailData } from "./types";

export async function renderEmail(d: EmailData) {
  return { subject: subjectFor(d), html: await render(CustomerEmail(d)), text: plainText(d) };
}
