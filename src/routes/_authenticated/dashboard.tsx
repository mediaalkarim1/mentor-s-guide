import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";

import { getExportRows, getMentorRecap } from "@/lib/recap.functions";
import { getAdminData } from "@/lib/admin.functions";
import { formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Rekap Mutabaah Mentor — Mutabaah Guru" },
      { name: "description", content: "Rekap nilai mutabaah pekanan binaan Anda." },
      { property: "og:title", content: "Rekap Mutabaah Mentor — Mutabaah Guru" },
      { property: "og:description", content: "Rekap nilai mutabaah pekanan binaan Anda." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const fetchRecap = useServerFn(getMentorRecap);
  const fetchAdmin = useServerFn(getAdminData);
  const fetchExport = useServerFn(getExportRows);
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [mentorId, setMentorId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["mentor-recap", periodId, mentorId],
    queryFn: () =>
      fetchRecap({
        data: {
          ...(periodId ? { periodId } : {}),
          ...(mentorId ? { mentorId } : {}),
        },
      }),
  });

  const isAdmin = data?.account.isAdmin ?? false;
  const { data: adminData } = useQuery({
    queryKey: ["admin-mentors"],
    queryFn: () => fetchAdmin({ data: {} }),
    enabled: isAdmin,
  });

  async function handleExport() {
    const rows = await fetchExport({ data: periodId ? { periodId } : {} });
    const header = ["Mentor", "Binaan", "Periode", ...(rows[0]?.scores.map((s) => s.name) ?? []), "Nilai"];
    const body = rows.map((r) => [
      r.mentor,
      r.binaan,
      r.period,
      ...r.scores.map((s) => String(s.score)),
      String(r.total),
    ]);
    downloadCsv("rekap-mutabaah.csv", [header, ...body]);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat rekap...
      </div>
    );
  }

  const recap = data?.recap;

  if (!recap) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Akun Anda belum terhubung dengan data Mentor. Minta Admin mendaftarkan email Anda pada data
        Mentor.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Mutabaah</h1>
          <p className="text-sm text-muted-foreground">
            Mentor: {isAdmin && mentorId
              ? (adminData?.mentors.find((m: any) => m.id === mentorId)?.name ?? "-")
              : (data?.account.mentor?.name ?? "-")}
            {recap.period
              ? ` · Periode ${formatPeriod(recap.period.start_date, recap.period.end_date)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Select value={mentorId ?? ""} onValueChange={(v) => setMentorId(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Mentor" />
              </SelectTrigger>
              <SelectContent>
                {(adminData?.mentors ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={recap.period?.id ?? ""} onValueChange={(v) => setPeriodId(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              {recap.periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {formatPeriod(p.start_date, p.end_date)}
                  {p.status === "active" ? " (aktif)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Rata-rata Nilai" value={String(recap.average)} />
        <Stat label="Sudah Mengisi" value={String(recap.filledCount)} />
        <Stat label="Belum Mengisi" value={String(recap.missingCount)} />
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3">No</th>
              <th className="px-3 py-3">Binaan</th>
              {recap.indicators.map((i) => (
                <th key={i.id} className="px-3 py-3 text-center">
                  {i.name}
                </th>
              ))}
              <th className="px-3 py-3 text-center">Nilai</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recap.rows.map((row, index) => (
              <tr key={row.binaanId} className="hover:bg-secondary/40">
                <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-3 font-medium">
                  <Link
                    to="/binaan/$binaanId"
                    params={{ binaanId: row.binaanId }}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                {recap.indicators.map((i) => (
                  <td key={i.id} className="px-3 py-3 text-center tabular-nums">
                    {row.filled ? (row.scores[i.id] ?? 0) : "–"}
                  </td>
                ))}
                <td className="px-3 py-3 text-center font-semibold tabular-nums">
                  {row.filled ? row.total : "–"}
                </td>
                <td className="px-3 py-3">
                  {row.filled ? (
                    <ScoreBadge score={row.total} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Belum mengisi</span>
                  )}
                </td>
              </tr>
            ))}
            {recap.rows.length === 0 && (
              <tr>
                <td colSpan={recap.indicators.length + 4} className="px-3 py-8 text-center text-muted-foreground">
                  Belum ada binaan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}