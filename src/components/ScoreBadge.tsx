import { categoryFor, categoryTone } from "@/lib/mutabaah-config";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  excellent: "bg-[#E5F6EC] text-[#087443] border-[#B7E8CB]",
  good: "bg-[#EAF6EE] text-[#21804D] border-[#C3E8D2]",
  fair: "bg-[#FFF5D9] text-[#9A6A00] border-[#FBE5A3]",
  low: "bg-[#FFF0E8] text-[#B45309] border-[#FDD0B8]",
  critical: "bg-[#FDECEC] text-[#B42318] border-[#F8B4B4]",
};

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs",
        statusStyles[categoryTone(score)] ?? "bg-[#F1F3F2] text-[#66736D] border-[#DCE9E1]",
        className,
      )}
    >
      {categoryFor(score)}
    </span>
  );
}