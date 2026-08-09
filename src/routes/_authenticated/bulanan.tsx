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
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat rekap bulanan...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Bulanan</h1>
          <p className="text-sm text-muted-foreground">
            Nilai bulanan = rata-rata nilai pekanan yang memiliki data.
          </p>
        </div>
        <Select value={data.month ?? ""} onValueChange={setMonth}>
          <SelectTrigger className="w-48">
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

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mentor</th>
              {data.periods.map((p, i) => (
                <th key={p.id} className="px-4 py-3 text-center">
                  Pekan {i + 1}
                  <span className="block text-[10px] font-normal normal-case">
                    {formatPeriod(p.start_date, p.end_date)}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-center">Nilai Bulanan</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.rows.map((row) => (
              <tr key={row.mentorId}>
                <td className="px-4 py-3 font-medium">{row.mentorName}</td>
                {row.weekly.map((v, i) => (
                  <td key={i} className="px-4 py-3 text-center tabular-nums">
                    {v === null ? "-" : formatDisplayScore(v)}
                  </td>
                ))}
                <td className="px-4 py-3 text-center font-semibold tabular-nums">
                  {formatDisplayScore(row.monthly)}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={row.monthly} />
                </td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={data.periods.length + 3} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}