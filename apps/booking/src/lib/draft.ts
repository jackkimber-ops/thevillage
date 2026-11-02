"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Team feedback (2 Nov): opening the menu or the privacy policy from a form, then coming back, emptied it.
// What's typed is kept for this visit (sessionStorage, gone when the tab closes) until the form is sent.

export type Draft = Record<string, string>;

const PREFIX = "village:draft:";
const cache = new Map<string, { raw: string | null; value: Draft | null }>();
const noSubscribe = () => () => {};

function snapshot(key: string): Draft | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PREFIX + key);
  } catch {
    // private mode etc.: no draft
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value: Draft | null = null;
  try {
    value = raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    value = null;
  }
  cache.set(key, { raw, value });
  return value;
}

/**
 * The saved draft, read once the page has loaded (the server never has one). Give the form
 * `key={draft ? "draft" : "new"}` so it starts again with the draft's values when one turns up.
 */
export function useDraft(key: string): Draft | null {
  return useSyncExternalStore(noSubscribe, () => snapshot(key), () => null);
}

export function clearDraft(key: string) {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {
    // nothing saved
  }
}

/**
 * For an uncontrolled form: puts the draft's values back into its fields, and saves as people type.
 * Spread the result on the `<form>`. Buttons that change hidden fields or add rows save on the next tick.
 */
export function useDraftForm(key: string, draft: Draft | null) {
  const ref = useRef<HTMLFormElement>(null);
  const restored = useRef(false);
  useEffect(() => {
    const form = ref.current;
    if (!form || !draft || restored.current) return;
    restored.current = true;
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
      if (el.type === "hidden" || el.readOnly || !el.name || !(el.name in draft)) continue;
      el.value = draft[el.name];
    }
  }, [draft]);
  const save = () => {
    const form = ref.current;
    if (!form) return;
    const d: Draft = {};
    for (const [k, v] of new FormData(form)) if (typeof v === "string") d[k] = v;
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(d));
    } catch {
      // can't keep it: the form still works
    }
  };
  return {
    ref,
    onChange: save,
    onClick: () => setTimeout(save),
  };
}

/** The "best way to reach you" saved in a draft. */
export function contactOf(draft: Draft | null): "whatsapp" | "zalo" | "call" | undefined {
  const c = draft?.contact;
  return c === "whatsapp" || c === "zalo" || c === "call" ? c : undefined;
}
