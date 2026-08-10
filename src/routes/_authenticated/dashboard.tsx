import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Users, CheckCircle2, AlertCircle, Calendar, RotateCcw, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { getExportRows, getMentorRecap, resetBinaanSubmission } from "@/lib/recap.functions";
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
  const resetBinaanFn = useServerFn(resetBinaanSubmission);
  const queryClient = useQueryClient();

  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [mentorId, setMentorId] = useState<string | undefined>(undefined);
  const [resetConfirmBinaan, setResetConfirmBinaan] = useState<{ id: string; name: string } | null>(null);

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

  const resetMutation = useMutation({
    mutationFn: async (targetBinaanId: string) => {
      const pid = recap?.period?.id;
      if (!pid) throw new Error("Periode tidak ditemukan.");
      return resetBinaanFn({ data: { binaanId: targetBinaanId, periodId: pid } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Pengisian mutabaah ${result.binaanName || ""} berhasil di-reset.`);
        queryClient.invalidateQueries({ queryKey: ["mentor-recap"] });
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["public-form-data"] });
      } else {
        toast.error(result.error || "Gagal melakukan reset pengisian.");
      }
      setResetConfirmBinaan(null);
    },
    onError: () => {
      toast.error("Terjadi kesalahan saat mereset data.");
      setResetConfirmBinaan(null);
    },
  });

  async function handleExport() {
    const rows = await fetchExport({ data: periodId ? { periodId } : {} });
    const header = ["Mentor", "Binaan", "Periode", ...(rows[0]?.scores.map((s) => s.name) ?? []), "Nilai"];
    const body = rows.map((r) => [
      r.mentor,
      r.binaan,
      r.period,
      ...r.scores.map((s) => (typeof s.score === "string" ? s.score : formatDisplayScore(s.score))),
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

      {/* Table Container - Weekly Recap */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white space-y-2">
        <div className="p-4 bg-[#F5FAF7] border-b border-[#DCE9E1] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#173C32] uppercase tracking-wide">
            Matriks Nilai Pekanan Binaan
          </h2>
          <span className="text-xs text-[#52635C] font-medium">
            Periode Active: {recap.period ? formatPeriod(recap.period.start_date, recap.period.end_date) : "-"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[55rem] text-sm">
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
                <th className="px-3.5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {uniqueRows.map((row, index) => {
                const isUzurIndicator = (indId: string) => row.uzurByIndicator?.[indId];
                return (
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
                      {row.filled && (
                        <span
                          className={cn(
                            "ml-2 text-[10px] font-bold px-2 py-0.5 rounded border",
                            row.attendanceStatus === "tidak_hadir"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200",
                          )}
                        >
                          {row.attendanceStatus === "tidak_hadir" ? "Tidak Hadir" : "Hadir"}
                        </span>
                      )}
                      {row.uzurCount > 0 && (
                        <span className="ml-1.5 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          {row.uzurCount} Uzur
                        </span>
                      )}
                    </td>
                    {recap.indicators.map((i) => {
                      if (!row.filled) {
                        return (
                          <td key={i.id} className="px-3 py-3 text-center text-xs text-[#52635C]">
                            –
                          </td>
                        );
                      }
                      if (isUzurIndicator(i.id)) {
                        return (
                          <td key={i.id} className="px-3 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              UZUR
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={i.id} className="px-3 py-3 text-center tabular-nums text-xs text-[#52635C]">
                          {formatDisplayScore(row.scores[i.id])}
                        </td>
                      );
                    })}
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
                    <td className="px-3.5 py-3 text-center">
                      {row.filled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetConfirmBinaan({ id: row.binaanId, name: row.name })}
                          className="h-8 px-2 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg"
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {uniqueRows.length === 0 && (
                <tr>
                  <td colSpan={recap.indicators.length + 5} className="px-3 py-8 text-center text-xs text-[#52635C]">
                    Belum ada data binaan untuk mentor ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KEHADIRAN MENTORING SECTION */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-[#DCE9E1] pb-3">
          <UserCheck className="h-5 w-5 text-[#006B54]" />
          <h2 className="text-base font-bold text-[#173C32]">KEHADIRAN MENTORING</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-[#EAF4EE] text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-3.5 py-3">Binaan</th>
                <th className="px-3.5 py-3 text-center">Hadir</th>
                <th className="px-3.5 py-3 text-center">Tidak Hadir</th>
                <th className="px-3.5 py-3 text-center">Persentase Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {(recap.attendanceStats ?? []).map((stat) => (
                <tr key={stat.binaanId} className="hover:bg-[#F5FAF7]">
                  <td className="px-3.5 py-3 font-semibold text-[#173C32]">{stat.binaanName}</td>
                  <td className="px-3.5 py-3 text-center font-semibold text-emerald-700">{stat.hadirCount}</td>
                  <td className="px-3.5 py-3 text-center font-semibold text-rose-700">{stat.tidakHadirCount}</td>
                  <td className="px-3.5 py-3 text-center font-bold text-[#006B54]">
                    {stat.percentage}%
                  </td>
                </tr>
              ))}
              {(recap.attendanceStats ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-[#52635C]">
                    Belum ada data kehadiran mentoring.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AlertDialog Confirmation for Reset */}
      <AlertDialog open={Boolean(resetConfirmBinaan)} onOpenChange={(open) => !open && setResetConfirmBinaan(null)}>
        <AlertDialogContent className="bg-white border-[#DCE9E1] rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#173C32]">
              Reset pengisian Mutabaah?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#52635C] mt-2">
              Data pengisian Binaan <strong>{resetConfirmBinaan?.name}</strong> pada periode aktif akan dihapus dan Binaan dapat mengisi kembali. Histori periode sebelumnya tetap aman.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-10 text-xs font-semibold rounded-xl border-[#DCE9E1]">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetConfirmBinaan && resetMutation.mutate(resetConfirmBinaan.id)}
              disabled={resetMutation.isPending}
              className="h-10 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              {resetMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Ya, Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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