import { act, fireEvent, renderHook } from "@testing-library/react";
import {
  AUTO_PAGE_RELOAD_INTERVAL_MS,
  AUTO_PAGE_RELOAD_PROMPT_SECONDS,
  clearAutoReloadDirtyState,
  useAutoPageReload,
} from "@/hooks/useAutoPageReload";

describe("useAutoPageReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("asks after thirty minutes and then forces one reload", () => {
    const reloadPage = vi.fn();
    const { result } = renderHook(() => useAutoPageReload({ reloadPage }));

    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_INTERVAL_MS));

    expect(result.current.isPromptOpen).toBe(true);
    expect(result.current.isBlockedByUnsavedChanges).toBe(false);
    expect(reloadPage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_PROMPT_SECONDS * 1000));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses the forced reload while a form has unsaved changes", () => {
    const reloadPage = vi.fn();
    const form = document.createElement("form");
    const input = document.createElement("input");
    form.appendChild(input);
    document.body.appendChild(form);
    const { result } = renderHook(() => useAutoPageReload({ reloadPage }));

    fireEvent.input(input, { target: { value: "Unsaved value" } });
    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_INTERVAL_MS));

    expect(result.current.isPromptOpen).toBe(true);
    expect(result.current.isBlockedByUnsavedChanges).toBe(true);
    expect(reloadPage).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    act(() => result.current.postpone());
    expect(result.current.isPromptOpen).toBe(false);
    expect(vi.getTimerCount()).toBe(1);

    clearAutoReloadDirtyState(form);
    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_INTERVAL_MS));
    expect(result.current.isBlockedByUnsavedChanges).toBe(false);
  });

  it("supports non-form editors with an explicit unsaved marker", () => {
    const reloadPage = vi.fn();
    const editor = document.createElement("div");
    editor.dataset.autoReloadUnsaved = "true";
    document.body.appendChild(editor);
    const { result } = renderHook(() => useAutoPageReload({ reloadPage }));

    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_INTERVAL_MS));
    expect(result.current.isBlockedByUnsavedChanges).toBe(true);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("cleans up its only timer and listeners when unmounted", () => {
    const reloadPage = vi.fn();
    const { unmount } = renderHook(() => useAutoPageReload({ reloadPage }));

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    act(() => vi.advanceTimersByTime(AUTO_PAGE_RELOAD_INTERVAL_MS));
    expect(reloadPage).not.toHaveBeenCalled();
  });
});
