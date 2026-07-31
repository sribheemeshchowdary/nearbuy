"use client";

import { cn } from "@/lib/utils";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";

/* ─────────────────────────────────────────────────────────────
   DialogStack — a stack of dialogs that transition one to the
   next (kibo-ui style). Supports both uncontrolled use and a
   controlled `activeIndex` so callers can gate navigation.
   ───────────────────────────────────────────────────────────── */

type DialogStackContextType = {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  totalDialogs: number;
  setTotalDialogs: (total: number) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clickable: boolean;
};

const DialogStackContext = createContext<DialogStackContextType | null>(null);
const useDialogStack = () => {
  const ctx = useContext(DialogStackContext);
  if (!ctx) throw new Error("DialogStack components must be used within <DialogStack>");
  return ctx;
};

// Per-child index provided by DialogStackBody.
const IndexContext = createContext(0);

interface DialogStackProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  clickable?: boolean;
}

export const DialogStack = ({
  children,
  className,
  open,
  defaultOpen = false,
  onOpenChange,
  activeIndex,
  onActiveIndexChange,
  clickable = false,
  ...props
}: DialogStackProps) => {
  const [openState, setOpenState] = useState(defaultOpen);
  const [indexState, setIndexState] = useState(0);
  const [totalDialogs, setTotalDialogs] = useState(0);

  const isControlledOpen = open !== undefined;
  const isControlledIndex = activeIndex !== undefined;
  const resolvedOpen = isControlledOpen ? open! : openState;
  const resolvedIndex = isControlledIndex ? activeIndex! : indexState;

  const setIsOpen = (v: boolean) => {
    if (!isControlledOpen) setOpenState(v);
    onOpenChange?.(v);
    if (!v && !isControlledIndex) setIndexState(0);
  };
  const setActiveIndex = (i: number) => {
    if (!isControlledIndex) setIndexState(i);
    onActiveIndexChange?.(i);
  };

  return (
    <DialogStackContext.Provider
      value={{ activeIndex: resolvedIndex, setActiveIndex, totalDialogs, setTotalDialogs, isOpen: resolvedOpen, setIsOpen, clickable }}
    >
      <div className={className} {...props}>
        {children}
      </div>
    </DialogStackContext.Provider>
  );
};

export const DialogStackTrigger = ({
  children,
  className,
  onClick,
  asChild,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { setIsOpen } = useDialogStack();
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<any>;
    return cloneElement(child, {
      onClick: (e: any) => {
        child.props.onClick?.(e);
        setIsOpen(true);
      },
    });
  }
  return (
    <button type="button" className={className} onClick={(e) => { onClick?.(e); setIsOpen(true); }} {...props}>
      {children}
    </button>
  );
};

export const DialogStackOverlay = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const { isOpen, setIsOpen } = useDialogStack();
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={cn("fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in-0", className)}
      onClick={() => setIsOpen(false)}
      {...props}
    />,
    document.body,
  );
};

export const DialogStackBody = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const { isOpen, setTotalDialogs, setIsOpen } = useDialogStack();
  const count = Children.count(children);

  useEffect(() => {
    setTotalDialogs(count);
  }, [count, setTotalDialogs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [isOpen, setIsOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
      <div className={cn("relative w-full max-w-lg pointer-events-auto", className)} {...props}>
        {Children.map(children, (child, index) =>
          isValidElement(child) ? (
            <IndexContext.Provider value={index}>{child}</IndexContext.Provider>
          ) : child,
        )}
      </div>
    </div>,
    document.body,
  );
};

export const DialogStackContent = ({
  children,
  className,
  offset = 12,
  ...props
}: HTMLAttributes<HTMLDivElement> & { offset?: number }) => {
  const { activeIndex, totalDialogs, clickable, setActiveIndex } = useDialogStack();
  const index = useContext(IndexContext);
  const distance = index - activeIndex; // <0 done, 0 active, >0 upcoming

  const isActive = distance === 0;
  const translateY = distance < 0 ? -offset * 1.5 : distance * offset;
  const scale = 1 - Math.min(Math.abs(distance), 3) * 0.05;
  const opacity = distance < 0 ? 0 : distance > 2 ? 0 : 1;

  return (
    <div
      className={cn(
        "left-0 right-0 top-0 rounded-2xl border border-border bg-card p-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out",
        isActive ? "relative" : "absolute",
        className,
      )}
      style={{
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        zIndex: totalDialogs - Math.abs(distance),
        pointerEvents: isActive ? "auto" : "none",
      }}
      onClick={() => { if (clickable && distance > 0) setActiveIndex(index); }}
      aria-hidden={!isActive}
      {...props}
    >
      {children}
    </div>
  );
};

export const DialogStackHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
);

export const DialogStackTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-bold tracking-tight text-foreground", className)} {...props} />
);

export const DialogStackDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const DialogStackFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex items-center gap-2", className)} {...props} />
);

export const DialogStackNext = ({
  children,
  className,
  asChild,
  onClick,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { activeIndex, totalDialogs, setActiveIndex } = useDialogStack();
  const next = () => { if (activeIndex < totalDialogs - 1) setActiveIndex(activeIndex + 1); };
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<any>;
    return cloneElement(child, { onClick: (e: any) => { child.props.onClick?.(e); next(); } });
  }
  return (
    <button type="button" className={className} onClick={(e) => { onClick?.(e); next(); }} {...props}>
      {children ?? "Next"}
    </button>
  );
};

export const DialogStackPrevious = ({
  children,
  className,
  asChild,
  onClick,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { activeIndex, setActiveIndex } = useDialogStack();
  const prev = () => { if (activeIndex > 0) setActiveIndex(activeIndex - 1); };
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<any>;
    return cloneElement(child, { onClick: (e: any) => { child.props.onClick?.(e); prev(); } });
  }
  return (
    <button type="button" className={className} onClick={(e) => { onClick?.(e); prev(); }} {...props}>
      {children ?? "Previous"}
    </button>
  );
};
