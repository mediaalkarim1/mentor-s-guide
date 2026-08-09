import { categoryFor, categoryTone } from "@/lib/mutabaah-config";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  excellent: "bg-success/15 text-success border-success/30",
  good: "bg-primary/10 text-primary border-primary/25",
  fair: "bg-accent text-accent-foreground border-accent-foreground/20",
  low: "bg-warning/20 text-warning-foreground border-warning/40",
  critical: "bg-destructive/12 text-destructive border-destructive/30",
};

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClass[categoryTone(score)],
        className,
      )}
    >
      {categoryFor(score)}
    </span>
  );
}