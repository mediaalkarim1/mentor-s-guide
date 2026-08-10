import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Users, CheckCircle2, AlertCircle, Calendar } from "lucide-react";

import { getExportRows, getMentorRecap } from "@/lib/recap.functions";
import { getAdminData } from "@/lib/admin.functions";
import { formatDisplayScore, formatPeriod } from "@/lib/mutabaah-config";
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
    queryFn: () => fetchAdmin(),
    enabled: isAdmin,
  });

  async function handleExport() {
    const rows = await fetchExport({ data: periodId ? { periodId } : {} });
    const header = ["Mentor", "Binaan", "Periode", ...(rows[0]?.scores.map((s) => s.name) ?? []), "Nilai"];
    const body = rows.map((r) => [
      r.mentor,
      r.binaan,
      r.period,
      ...r.scores.map((s) => formatDisplayScore(s.score)),
      formatDisplayScore(r.total),
    ]);
    downloadCsv("rekap-mutabaah.csv", [header, ...body]);
  }

  const recap = data?.recap;

  const uniqueRows = useMemo(
    () => [...((recap?.rows ?? []) as any[])].sort((x, y) => x.name.localeCompare(y.name)),
    [recap?.rows],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat rekap mutabaah...
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="surface-card p-6 text-sm text-[#52635C] border border-[#DCE9E1] rounded-xl bg-white">
        Akun Anda belum terhubung dengan data Mentor. Minta Admin mendaftarkan email Anda pada data
        Mentor.
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">Rekap Mutabaah Pekanan</h1>
          <p className="text-xs sm:text-sm text-[#52635C] mt-0.5">
            Mentor: <strong className="text-[#173C32]">{isAdmin && mentorId
              ? (adminData?.mentors.find((m: any) => m.id === mentorId)?.name ?? "-")
              : (data?.account.mentor?.name ?? "-")}</strong>
            {recap.period
              ? ` · Periode ${formatPeriod(recap.period.start_date, recap.period.end_date)}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Select value={mentorId ?? ""} onValueChange={(v) => setMentorId(v)}>
              <SelectTrigger className="w-full sm:w-48 bg-white border-[#DCE9E1] h-10 text-xs">
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
            <SelectTrigger className="w-full sm:w-56 bg-white border-[#DCE9E1] h-10 text-xs">
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
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto bg-[#EAF4EE] border-[#CFE4D8] text-[#006B54] hover:bg-[#006B54] hover:text-white h-10 text-xs font-semibold"
          >
            <Link to="/bulanan">
              <Calendar className="mr-1.5 h-4 w-4" /> Rekap Bulanan
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="w-full sm:w-auto bg-white border-[#DCE9E1] text-[#006B54] hover:bg-[#EAF4EE] h-10 text-xs font-semibold"
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Rata-rata Nilai"
          value={formatDisplayScore(recap.average)}
          icon={<Users className="h-4 w-4 text-[#006B54]" />}
        />
        <Stat
          label="Sudah Mengisi"
          value={String(recap.filledCount)}
          icon={<CheckCircle2 className="h-4 w-4 text-[#087443]" />}
          badgeClass="bg-[#E5F6EC] text-[#087443]"
        />
        <Stat
          label="Belum Mengisi"
          value={String(recap.missingCount)}
          icon={<AlertCircle className="h-4 w-4 text-[#B45309]" />}
          badgeClass="bg-[#FFF0E8] text-[#B45309]"
        />
      </div>

      {/* Table Container - Mobile Horizontal Scroll Isolated */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="bg-[#EAF4EE] text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-3.5 py-3 w-12 text-center">No</th>
                <th className="px-3.5 py-3">Nama Binaan</th>
                {recap.indicators.map((i) => (
                  <th key={i.id} className="px-3 py-3 text-center">
                    {i.name}
                  </th>
                ))}
                <th className="px-3.5 py-3 text-center">Nilai Pekanan</th>
                <th className="px-3.5 py-3">Status Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {uniqueRows.map((row, index) => (
                <tr key={row.binaanId} className="hover:bg-[#F5FAF7] transition-colors">
                  <td className="px-3.5 py-3 text-center text-xs text-[#52635C] tabular-nums">{index + 1}</td>
                  <td className="px-3.5 py-3 font-semibold text-[#173C32]">
                    <Link
                      to="/binaan/$binaanId"
                      params={{ binaanId: row.binaanId }}
                      className="text-[#006B54] hover:underline hover:text-[#0F8A6A]"
                    >
                      {row.name}
                    </Link>
                  </td>
                  {recap.indicators.map((i) => (
                    <td key={i.id} className="px-3 py-3 text-center tabular-nums text-xs text-[#52635C]">
                      {row.filled ? formatDisplayScore(row.scores[i.id]) : "–"}
                    </td>
                  ))}
                  <td className="px-3.5 py-3 text-center font-bold tabular-nums text-[#006B54]">
                    {row.filled ? formatDisplayScore(row.total) : "–"}
                  </td>
                  <td className="px-3.5 py-3">
                    {row.filled ? (
                      <ScoreBadge score={row.total} />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-[#F1F3F2] px-2.5 py-0.5 text-xs font-medium text-[#66736D]">
                        Belum mengisi
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {uniqueRows.length === 0 && (
                <tr>
                  <td colSpan={recap.indicators.length + 4} className="px-3 py-8 text-center text-xs text-[#52635C]">
                    Belum ada data binaan untuk mentor ini.
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

function Stat({ label, value, icon, badgeClass }: { label: string; value: string; icon?: React.ReactNode; badgeClass?: string }) {
  return (
    <div className="surface-card p-4 sm:p-5 border border-[#DCE9E1] rounded-2xl bg-white shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#52635C] uppercase tracking-wider">{label}</p>
        {icon && <div className={`p-2 rounded-xl ${badgeClass ?? "bg-[#EAF4EE]"}`}>{icon}</div>}
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#173C32]">{value}</p>
    </div>
  );
}