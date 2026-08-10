import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TrendingUp, Calendar, UserCheck, CheckCircle2, ChevronRight } from "lucide-react";

import {
  getBinaanMonthlyRecap,
  getMonthlyRecap,
  getSingleBinaanMonthlyDetail,
} from "@/lib/recap.functions";
import { getAdminData } from "@/lib/admin.functions";
import { categoryFor, formatDisplayScore, formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/bulanan")({
  head: () => ({
    meta: [
      { title: "Rekap Bulanan Binaan — Mutabaah Guru" },
      { name: "description", content: "Rekapitulasi perkembangan nilai bulanan binaan." },
      { property: "og:title", content: "Rekap Bulanan Binaan — Mutabaah Guru" },
      { property: "og:description", content: "Rekapitulasi perkembangan nilai bulanan binaan." },
    ],
  }),
  component: MonthlyPage,
});

function MonthlyPage() {
  const fetchBinaanMonthly = useServerFn(getBinaanMonthlyRecap);
  const fetchMentorMonthly = useServerFn(getMonthlyRecap);
  const fetchAdmin = useServerFn(getAdminData);

  const [month, setMonth] = useState<string | undefined>(undefined);
  const [selectedMentorId, setSelectedMentorId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"binaan" | "mentor">("binaan");
  const [selectedBinaanId, setSelectedBinaanId] = useState<string | null>(null);

  // Fetch Binaan Monthly Recap
  const binaanQuery = useQuery({
    queryKey: ["binaan-monthly", month, selectedMentorId],
    queryFn: () =>
      fetchBinaanMonthly({
        data: {
          ...(month ? { month } : {}),
          ...(selectedMentorId ? { mentorId: selectedMentorId } : {}),
        },
      }),
  });

  // Fetch Mentor Overview Monthly Recap
  const mentorQuery = useQuery({
    queryKey: ["mentor-monthly", month],
    queryFn: () => fetchMentorMonthly({ data: month ? { month } : {} }),
    enabled: viewMode === "mentor" || Boolean(binaanQuery.data?.isAdmin),
  });

  const isAdmin = binaanQuery.data?.isAdmin ?? false;
  const { data: adminData } = useQuery({
    queryKey: ["admin-mentors"],
    queryFn: () => fetchAdmin(),
    enabled: isAdmin,
  });

  const isLoading = binaanQuery.isLoading;
  const data = binaanQuery.data;

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat rekap bulanan binaan...
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Page Header & View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B54] bg-[#EAF4EE] px-3 py-1 rounded-full mb-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Rekapitulasi Bulanan Binaan</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">Rekap Bulanan Binaan</h1>
          <p className="text-xs sm:text-sm text-[#52635C] mt-0.5">
            Mentor: <strong className="text-[#173C32]">{data.mentorName}</strong> · Periode Bulan:{" "}
            <strong className="text-[#006B54]">{data.month || "Terbaru"}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center rounded-lg border border-[#DCE9E1] bg-white p-0.5 text-xs">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  viewMode === "binaan"
                    ? "bg-[#006B54] text-white"
                    : "text-[#52635C] hover:text-[#173C32]"
                }`}
                onClick={() => setViewMode("binaan")}
              >
                Binaan Saya
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  viewMode === "mentor"
                    ? "bg-[#006B54] text-white"
                    : "text-[#52635C] hover:text-[#173C32]"
                }`}
                onClick={() => setViewMode("mentor")}
              >
                Semua Mentor
              </button>
            </div>
          )}

          {isAdmin && (
            <Select
              value={selectedMentorId ?? ""}
              onValueChange={(v) => setSelectedMentorId(v)}
            >
              <SelectTrigger className="w-full sm:w-44 bg-white border-[#DCE9E1] h-10 text-xs">
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

          <Select
            value={data.month ?? ""}
            onValueChange={(v) => setMonth(v)}
          >
            <SelectTrigger className="w-full sm:w-48 bg-white border-[#DCE9E1] h-10 text-xs font-semibold text-[#173C32]">
              <SelectValue placeholder="Pilih Bulan" />
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
      </div>

      {/* Main Table: Binaan Monthly Recap */}
      {viewMode === "binaan" ? (
        <div className="space-y-5">
          <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
            <div className="border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3 sm:px-5 flex justify-between items-center">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#173C32]">
                  Progres Mutabaah Bulanan Binaan
                </h2>
                <p className="text-xs text-[#52635C]">
                  Klik nama Binaan untuk melihat rincian pekanan & evaluasi indikator.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#006B54] bg-white px-2.5 py-1 rounded-full border border-[#DCE9E1]">
                {data.rows.length} Binaan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="bg-[#EAF4EE]/60 text-left text-xs uppercase tracking-wide text-[#245347]">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">No</th>
                    <th className="px-4 py-3">Nama Binaan</th>
                    {data.periods.map((p, i) => (
                      <th key={p.id} className="px-3 py-3 text-center">
                        Pekan {i + 1}
                        <span className="block text-[10px] font-normal normal-case text-[#52635C]">
                          {formatPeriod(p.start_date, p.end_date)}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center">Rata-rata Bulanan</th>
                    <th className="px-4 py-3">Status Predikat</th>
                    <th className="px-3 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE9E1]">
                  {data.rows.map((row, index) => (
                    <tr
                      key={row.binaanId}
                      className="hover:bg-[#F5FAF7] transition-colors cursor-pointer"
                      onClick={() => setSelectedBinaanId(row.binaanId)}
                    >
                      <td className="px-4 py-3 text-center text-xs text-[#52635C] tabular-nums">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#173C32]">
                        <button
                          type="button"
                          className="text-[#006B54] hover:underline font-bold text-left cursor-pointer flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBinaanId(row.binaanId);
                          }}
                        >
                          <span>{row.binaanName}</span>
                        </button>
                      </td>
                      {row.weeklyScores.map((score, i) => (
                        <td
                          key={i}
                          className="px-3 py-3 text-center tabular-nums text-xs text-[#52635C]"
                        >
                          {score === null ? (
                            <span className="text-[#A3B8AD]">–</span>
                          ) : (
                            <span className="font-semibold text-[#173C32]">
                              {formatDisplayScore(score)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-bold tabular-nums text-base text-[#006B54]">
                        {formatDisplayScore(row.monthlyAverage)}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={row.monthlyAverage} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#006B54] hover:bg-[#EAF4EE]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={data.periods.length + 4}
                        className="px-4 py-8 text-center text-xs text-[#52635C]"
                      >
                        Belum ada data bulanan untuk Binaan Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Rekap Kehadiran Mentoring Bulanan */}
          <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-[#DCE9E1] pb-3">
              <UserCheck className="h-5 w-5 text-[#006B54]" />
              <div>
                <h2 className="text-base font-bold text-[#173C32]">Rekap Kehadiran Mentoring Bulanan</h2>
                <p className="text-xs text-[#52635C]">Statistik kehadiran mentoring bulan {data.month || "ini"}</p>
              </div>
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
                  {(data.attendanceStats ?? []).map((stat) => (
                    <tr key={stat.binaanId} className="hover:bg-[#F5FAF7]">
                      <td className="px-3.5 py-3 font-semibold text-[#173C32]">{stat.binaanName}</td>
                      <td className="px-3.5 py-3 text-center font-semibold text-emerald-700">{stat.hadirCount}</td>
                      <td className="px-3.5 py-3 text-center font-semibold text-rose-700">{stat.tidakHadirCount}</td>
                      <td className="px-3.5 py-3 text-center font-bold text-[#006B54]">
                        {stat.percentage}%
                      </td>
                    </tr>
                  ))}
                  {(data.attendanceStats ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-xs text-[#52635C]">
                        Belum ada data kehadiran mentoring untuk bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Mentor Overview Table (Admin View) */
        <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
          <div className="border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3 sm:px-5">
            <h2 className="text-sm sm:text-base font-bold text-[#173C32]">
              Rekapitulasi Bulanan Seluruh Mentor
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="bg-[#EAF4EE]/60 text-left text-xs uppercase tracking-wide text-[#245347]">
                <tr>
                  <th className="px-4 py-3">Mentor</th>
                  {(mentorQuery.data?.periods ?? []).map((p, i) => (
                    <th key={p.id} className="px-4 py-3 text-center">
                      Pekan {i + 1}
                      <span className="block text-[10px] font-normal normal-case text-[#52635C]">
                        {formatPeriod(p.start_date, p.end_date)}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center">Nilai Bulanan</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE9E1]">
                {(mentorQuery.data?.rows ?? []).map((row) => (
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Binaan Monthly Detail Dialog */}
      {selectedBinaanId && (
        <BinaanMonthlyDetailDialog
          binaanId={selectedBinaanId}
          month={data.month}
          onClose={() => setSelectedBinaanId(null)}
        />
      )}
    </div>
  );
}

function BinaanMonthlyDetailDialog({
  binaanId,
  month,
  onClose,
}: {
  binaanId: string;
  month?: string;
  onClose: () => void;
}) {
  const fetchSingleDetail = useServerFn(getSingleBinaanMonthlyDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["binaan-single-monthly-detail", binaanId, month],
    queryFn: () => fetchSingleDetail({ data: { binaanId, month } }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] sm:max-w-[32rem] max-h-[88vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">
            REKAP BULANAN BINAAN
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12 text-[#52635C]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat rincian bulanan...
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Header Card Info */}
            <div className="bg-[#F5FAF7] p-4 rounded-xl border border-[#DCE9E1] space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center border-b border-[#DCE9E1] pb-2">
                <span className="text-[#52635C]">Nama Binaan</span>
                <span className="font-bold text-[#173C32] text-sm">{data.binaanName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#52635C]">Mentor Pengampu</span>
                <span className="font-semibold text-[#173C32]">{data.mentorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#52635C]">Bulan</span>
                <span className="font-semibold text-[#006B54]">{data.month}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#DCE9E1]">
                <span className="text-[#52635C]">Rata-rata Bulanan</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-[#006B54]">{formatDisplayScore(data.monthlyAverage)}</span>
                  <ScoreBadge score={data.monthlyAverage} />
                </div>
              </div>
            </div>

            {/* Weekly Score Breakdown */}
            <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-xl">
              <div className="bg-[#EAF4EE] px-3.5 py-2.5 font-bold text-xs text-[#173C32] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#006B54]" />
                <span>Rincian Pekanan Bulan Ini</span>
              </div>
              <div className="divide-y divide-[#DCE9E1] text-xs">
                {data.weeklyBreakdown.map((w) => (
                  <div key={w.periodId} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#F5FAF7]">
                    <div>
                      <p className="font-semibold text-[#173C32]">Pekan {w.weekNumber}</p>
                      <p className="text-[10px] text-[#52635C]">{formatPeriod(w.startDate, w.endDate)}</p>
                    </div>
                    <div className="tabular-nums font-bold">
                      {w.score !== null ? (
                        <span className="text-[#006B54] text-sm">{formatDisplayScore(w.score)}</span>
                      ) : (
                        <span className="text-[#52635C] italic">Belum Mengisi</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simple Visual Trend Progress Bars */}
            <div className="surface-card p-3.5 border border-[#DCE9E1] rounded-xl space-y-2">
              <p className="text-xs font-bold text-[#173C32]">Grafik Perkembangan Pekanan</p>
              <div className="space-y-2 pt-1">
                {data.weeklyBreakdown.map((w) => {
                  const scoreVal = w.score ?? 0;
                  return (
                    <div key={w.periodId} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-[#52635C]">Pekan {w.weekNumber}</span>
                        <span className="font-bold text-[#006B54]">{w.score !== null ? formatDisplayScore(w.score) : "0"}</span>
                      </div>
                      <div className="h-2 w-full bg-[#EAF4EE] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#006B54] transition-all duration-300 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, scoreVal))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 9 Indicators Monthly Performance Summary */}
            <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-xl">
              <div className="bg-[#EAF4EE] px-3.5 py-2.5 font-bold text-xs text-[#173C32]">
                Rata-rata 9 Indikator Mutabaah Bulan Ini
              </div>
              <div className="divide-y divide-[#DCE9E1] text-xs">
                {data.indicatorSummary.map((ind) => (
                  <div key={ind.id} className="flex items-center justify-between px-3.5 py-2 hover:bg-[#F5FAF7]">
                    <div>
                      <p className="font-semibold text-[#173C32]">{ind.name}</p>
                      <p className="text-[10px] text-[#52635C]">Target: {ind.target} {ind.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#006B54]">{formatDisplayScore(ind.avgScore)}%</p>
                      <p className="text-[10px] text-[#52635C]">Rerata: {ind.avgRealization} {ind.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} className="w-full border-[#DCE9E1]">
            Tutup Detail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}