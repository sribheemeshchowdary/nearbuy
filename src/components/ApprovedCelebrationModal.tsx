import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PartyPopper, Sparkles, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  businessName: string;
  onClose: () => void;
}

/**
 * Premium, glossy, centered celebration modal shown to a business owner when
 * their listing goes live. Fully responsive (mobile → desktop).
 */
export const ApprovedCelebrationModal = ({ open, businessName, onClose }: Props) => (
  <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogPrimitive.Portal>
      {/* Dim + blur backdrop */}
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />

      <DialogPrimitive.Content
        aria-describedby="celebration-desc"
        className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
      >
        {/* Shiny gradient border wrapper */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-white/50 via-white/15 to-transparent p-[1.5px] shadow-[0_35px_90px_-25px_rgba(4,120,87,0.75)]">
          {/* Glossy premium card */}
          <div className="relative overflow-hidden rounded-[25px] bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 px-6 py-9 text-center sm:px-9 sm:py-11">
            {/* Top sheen */}
            <div className="pointer-events-none absolute inset-x-0 -top-1/3 h-2/3 bg-gradient-to-b from-white/30 to-transparent" />
            {/* Soft color glows */}
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -top-14 h-48 w-48 rounded-full bg-emerald-200/25 blur-3xl" />

            <div className="relative">
              {/* Frosted icon badge */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/40 backdrop-blur-md sm:h-20 sm:w-20">
                <PartyPopper className="h-8 w-8 text-white sm:h-10 sm:w-10" />
              </div>

              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/95 ring-1 ring-white/20">
                <Sparkles className="h-3 w-3" /> You're live
              </div>

              <DialogPrimitive.Title className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-3xl">
                Congratulations! 🎉
              </DialogPrimitive.Title>

              <DialogPrimitive.Description
                id="celebration-desc"
                className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/90 sm:text-base"
              >
                Your business{" "}
                <span className="font-bold text-white break-words">{businessName}</span>{" "}
                has been approved. It is live now.
              </DialogPrimitive.Description>

              <p className="mt-2 text-sm font-semibold text-white sm:text-base">Happy Near Buying! 🛍️</p>

              <button
                onClick={onClose}
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-white/90 active:scale-[0.98]"
              >
                Continue to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
