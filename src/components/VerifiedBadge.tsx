import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

const VerifiedBadge = ({ size = "sm" }: VerifiedBadgeProps) => {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">
          <BadgeCheck className={`${iconSize} text-primary fill-primary/20`} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified Business — documents reviewed & approved</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
