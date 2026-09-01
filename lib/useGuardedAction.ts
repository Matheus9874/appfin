"use client";

import { useRef } from "react";

/**
 * Wraps a Server Action so a second submit fired before the first one
 * resolves is dropped — even if both submits happen in the same tick.
 *
 * A `disabled` button driven by React state (e.g. useFormStatus's `pending`)
 * only takes effect after a re-render, which isn't fast enough to stop a
 * genuine fast double-click: both clicks can dispatch their submit before
 * React ever disables the button, invoking the action twice and creating a
 * duplicate row. A ref mutation is synchronous and has no such gap.
 */
export function useGuardedAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  const submittingRef = useRef(false);

  return async (...args: Args) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await action(...args);
    } finally {
      submittingRef.current = false;
    }
  };
}
