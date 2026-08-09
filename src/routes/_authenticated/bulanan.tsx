import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { getMonthlyRecap } from "@/lib/recap.functions";
import { formatDisplayScore, formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/bulanan")({
  head: () => ({
    meta: [
      { title: "Rekap Bulanan Mentor — Mutabaah Guru" },
      { name: "description", content: "Nilai bulanan mentor dari rata-rata nilai pekanan." },
      { property: "og:title", content: "Rekap Bulanan Mentor — Mutabaah Guru" },
      { property: "og:description", content: "Nilai bulanan mentor dari rata-rata nilai pekanan." },
    ],
  }),
  component: MonthlyPage,
});

function MonthlyPage() {
  const fetchMonthly = useServerFn(getMonthlyRecap);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery({
    queryKey: ["monthly", month],
    queryFn: () => fetchMonthly({ data: month ? { month } : {} }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat rekap bulanan...
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">Rekap Bulanan Mentor</h1>
          <p className="text-xs sm:text-sm text-[#52635C] mt-0.5">
            Nilai bulanan dihitung dari rata-rata nilai pekanan yang memiliki data.
          </p>
        </div>
        <Select value={data.month ?? ""} onValueChange={setMonth}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-[#DCE9E1] h-10 text-xs">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            {data.months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead className="bg-[#EAF4EE] text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-4 py-3">Mentor</th>
                {data.periods.map((p, i) => (
                  <th key={p.id} className="px-4 py-3 text-center">
                    Pekan {i + 1}
                    <span className="block text-[10px] font-normal normal-case text-[#52635C]">
                      {formatPeriod(p.start_date, p.end_date)}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center">Nilai Bulanan</th>
                <th className="px-4 py-3">Status Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {data.rows.map((row) => (
                <tr key={row.mentorId} className="hover:bg-[#F5FAF7] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#173C32]">{row.mentorName}</td>
                  {row.weekly.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center tabular-nums text-xs text-[#52635C]">
                      {v === null ? "-" : formatDisplayScore(v)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-bold tabular-nums text-[#006B54]">
                    {formatDisplayScore(row.monthly)}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={row.monthly} />
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={data.periods.length + 3} className="px-4 py-8 text-center text-xs text-[#52635C]">
                    Belum ada data rekap bulanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}