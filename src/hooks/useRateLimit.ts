import { useRef, useCallback } from "react";

export function useRateLimit(maxAttempts: number = 3, windowMs: number = 60000) {
  const attempts = useRef<number[]>([]);

  const checkLimit = useCallback(() => {
    const now = Date.now();
    attempts.current = attempts.current.filter((t) => now - t < windowMs);
    if (attempts.current.length >= maxAttempts) {
      const oldest = attempts.current[0];
      const waitSec = Math.ceil((windowMs - (now - oldest)) / 1000);
      return { allowed: false, waitSec };
    }
    attempts.current.push(now);
    return { allowed: true, waitSec: 0 };
  }, [maxAttempts, windowMs]);

  return checkLimit;
}
