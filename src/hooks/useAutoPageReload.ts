import { useCallback, useEffect, useRef, useState } from "react";

/** Thirty minutes, expressed once so the production value and tests stay aligned. */
export const AUTO_PAGE_RELOAD_INTERVAL_MS = 30 * 60 * 1000;
export const AUTO_PAGE_RELOAD_PROMPT_SECONDS = 10;

const DIRTY_ATTRIBUTE = "data-auto-reload-dirty";
const DIRTY_SELECTOR = `[${DIRTY_ATTRIBUTE}="true"], [data-auto-reload-unsaved="true"]`;
const IGNORE_SELECTOR = "[data-auto-reload-ignore]";
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable]";
const DIRTY_CONTAINER_SELECTOR = "form, [data-auto-reload-scope]";

export interface AutoPageReloadOptions {
  /** Defaults to 30 minutes. Configurable for tests and exceptional deployments. */
  intervalMs?: number;
  /** Seconds the refresh notice remains visible before a safe forced reload. */
  promptSeconds?: number;
  enabled?: boolean;
  /** Adds an application-specific unsaved-change check to the DOM checks. */
  hasUnsavedChanges?: () => boolean;
  /** Defaults to a normal browser reload. Injectable for deterministic tests. */
  reloadPage?: () => void;
}

export interface AutoPageReloadState {
  isPromptOpen: boolean;
  isBlockedByUnsavedChanges: boolean;
  secondsUntilReload: number;
  reloadNow: () => void;
  postpone: () => void;
}

const getElement = (target: EventTarget | Element | null): Element | null =>
  target instanceof Element ? target : null;

const getDirtyScope = (target: EventTarget | Element | null): Element | null => {
  const element = getElement(target);
  if (!element || element.closest(IGNORE_SELECTOR)) return null;
  // Prefer the containing form/editor so one successful save clears every
  // nested control. Standalone controls remain independently protected.
  return element.closest(DIRTY_CONTAINER_SELECTOR) ?? element.closest(EDITABLE_SELECTOR);
};

/**
 * Clears the automatic dirty marker after an operation has saved successfully.
 * Pass the form, editable element, or any child inside a data-auto-reload-scope.
 */
export const clearAutoReloadDirtyState = (target: Element | null) => {
  const scope = getDirtyScope(target);
  scope?.removeAttribute(DIRTY_ATTRIBUTE);
};

/**
 * Default safety check used immediately before a scheduled reload.
 *
 * - Form controls edited by the user are marked automatically.
 * - Non-form editors can expose `data-auto-reload-unsaved="true"` while dirty.
 * - `data-auto-reload-ignore` opts a search/filter control out of protection.
 */
export const hasAutoReloadBlockingChanges = () =>
  typeof document !== "undefined" && document.querySelector(DIRTY_SELECTOR) !== null;

const reloadCurrentPage = () => window.location.reload();

/**
 * Starts one 30-minute visit timer, displays a short refresh notice, and then
 * reloads the current URL. A dirty form pauses the forced reload to prevent
 * data loss. Mount this hook once near the application root.
 */
export const useAutoPageReload = ({
  intervalMs = AUTO_PAGE_RELOAD_INTERVAL_MS,
  promptSeconds = AUTO_PAGE_RELOAD_PROMPT_SECONDS,
  enabled = true,
  hasUnsavedChanges = hasAutoReloadBlockingChanges,
  reloadPage = reloadCurrentPage,
}: AutoPageReloadOptions = {}): AutoPageReloadState => {
  const timerRef = useRef<number | null>(null);
  const scheduleNextCycleRef = useRef<() => void>(() => {});
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isBlockedByUnsavedChanges, setIsBlockedByUnsavedChanges] = useState(false);
  const [secondsUntilReload, setSecondsUntilReload] = useState(promptSeconds);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const readUnsavedState = useCallback(() => {
    // A failing custom check must never cause user-entered data to be discarded.
    try {
      return hasUnsavedChanges();
    } catch {
      return true;
    }
  }, [hasUnsavedChanges]);

  const reloadNow = useCallback(() => {
    if (readUnsavedState()) {
      clearTimer();
      setIsBlockedByUnsavedChanges(true);
      setIsPromptOpen(true);
      return;
    }

    clearTimer();
    setIsPromptOpen(false);
    reloadPage();
  }, [clearTimer, readUnsavedState, reloadPage]);

  const postpone = useCallback(() => {
    clearTimer();
    setIsPromptOpen(false);
    setIsBlockedByUnsavedChanges(false);
    setSecondsUntilReload(promptSeconds);
    scheduleNextCycleRef.current();
  }, [clearTimer, promptSeconds]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let disposed = false;

    const markEditedControl = (event: Event) => {
      const scope = getDirtyScope(event.target);
      scope?.setAttribute(DIRTY_ATTRIBUTE, "true");
    };

    const clearResetForm = (event: Event) => {
      const scope = getDirtyScope(event.target);
      // Wait until the browser has restored the controls to their defaults.
      queueMicrotask(() => scope?.removeAttribute(DIRTY_ATTRIBUTE));
    };

    const forceReload = () => {
      if (disposed) return;

      // Recheck at the final moment in case an editor became dirty while the
      // notice was displayed programmatically.
      if (readUnsavedState()) {
        clearTimer();
        setIsBlockedByUnsavedChanges(true);
        setIsPromptOpen(true);
        return;
      }

      clearTimer();
      setIsPromptOpen(false);
      reloadPage();
    };

    const beginCountdown = () => {
      const safePromptSeconds = Math.max(0, Math.floor(promptSeconds));
      setSecondsUntilReload(safePromptSeconds);

      if (safePromptSeconds === 0) {
        forceReload();
        return;
      }

      const deadline = Date.now() + safePromptSeconds * 1000;
      const tick = () => {
        if (disposed) return;
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setSecondsUntilReload(remaining);

        if (remaining === 0) {
          forceReload();
          return;
        }

        clearTimer();
        timerRef.current = window.setTimeout(tick, 1000);
      };

      clearTimer();
      timerRef.current = window.setTimeout(tick, 1000);
    };

    const showReloadPrompt = () => {
      if (disposed) return;
      clearTimer();

      const blocked = readUnsavedState();
      setIsBlockedByUnsavedChanges(blocked);
      setIsPromptOpen(true);

      if (!blocked) beginCountdown();
    };

    const scheduleNextCycle = () => {
      if (disposed) return;
      clearTimer();
      timerRef.current = window.setTimeout(showReloadPrompt, intervalMs);
    };

    scheduleNextCycleRef.current = scheduleNextCycle;

    // Capture events so controlled React inputs and nested form components are
    // covered without adding handlers to every route.
    document.addEventListener("input", markEditedControl, true);
    document.addEventListener("change", markEditedControl, true);
    document.addEventListener("reset", clearResetForm, true);
    scheduleNextCycle();

    return () => {
      disposed = true;
      scheduleNextCycleRef.current = () => {};
      clearTimer();
      document.removeEventListener("input", markEditedControl, true);
      document.removeEventListener("change", markEditedControl, true);
      document.removeEventListener("reset", clearResetForm, true);
    };
  }, [clearTimer, enabled, intervalMs, promptSeconds, readUnsavedState, reloadPage]);

  return {
    isPromptOpen,
    isBlockedByUnsavedChanges,
    secondsUntilReload,
    reloadNow,
    postpone,
  };
};

export default useAutoPageReload;
