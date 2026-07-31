import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAutoPageReload } from "@/hooks/useAutoPageReload";

/** Global refresh notice. Mount exactly once near the application root. */
const AutoPageReload = () => {
  const {
    isPromptOpen,
    isBlockedByUnsavedChanges,
    secondsUntilReload,
    reloadNow,
    postpone,
  } = useAutoPageReload();

  return (
    <AlertDialog open={isPromptOpen}>
      <AlertDialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="max-w-md rounded-2xl"
      >
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isBlockedByUnsavedChanges ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </div>
          <AlertDialogTitle>
            {isBlockedByUnsavedChanges ? "Finish your changes first" : "Page refresh required"}
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {isBlockedByUnsavedChanges
              ? "The automatic refresh was paused because this page contains unsaved changes. Continue working and save or submit them first."
              : `To keep business information current, this page will refresh automatically in ${secondsUntilReload} second${secondsUntilReload === 1 ? "" : "s"}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {isBlockedByUnsavedChanges ? (
            <AlertDialogCancel onClick={postpone}>Continue working</AlertDialogCancel>
          ) : (
            <AlertDialogAction onClick={reloadNow} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload now
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AutoPageReload;
