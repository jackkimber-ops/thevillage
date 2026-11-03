"use client";

import { useEffect, useRef } from "react";

/**
 * For "add" forms (team check, 3 Nov): after a successful save the form empties, so it doesn't look as if
 * nothing happened (keepValues keeps what was typed, which is right after an error but not after success).
 * Put the returned ref on the <form>.
 */
export function useClearOnSuccess(state: { ok?: string } | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}
