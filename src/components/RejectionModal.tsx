import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit3 } from "lucide-react";

interface Props {
  open: boolean;
  businessName: string;
  reason?: string;
  onEdit: () => void;
  onClose: () => void;
}

/**
 * Shown to a business owner after login when a listing was rejected, with the
 * reason supplied by the admin. Responsive on all devices.
 */
export const RejectionModal = ({ open, businessName, reason, onEdit, onClose }: Props) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="sm:max-w-md rounded-2xl">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <DialogTitle className="text-xl font-bold text-foreground">
          Your listing wasn't approved
        </DialogTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Your business{" "}
          <span className="font-semibold text-foreground break-words">{businessName}</span>{" "}
          couldn't be approved yet.
        </p>
      </div>

      {reason && (
        <div className="mt-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-destructive/80">
            Reason from our team
          </p>
          <p className="mt-1 text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">
            {reason}
          </p>
        </div>
      )}

      <div className="mt-2 flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
          Dismiss
        </Button>
        <Button className="flex-1 rounded-xl" onClick={onEdit}>
          <Edit3 className="w-4 h-4 mr-1.5" /> Edit &amp; Resubmit
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
