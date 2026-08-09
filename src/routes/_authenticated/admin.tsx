import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Users, CheckCircle2, AlertCircle, Award } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/AuthProvider";
import { getClientMasterStore, updateClientMasterStore, type MasterClientStore } from "@/lib/master_store_client";
import { getMyAccount } from "@/lib/recap.functions";
import {
  deleteBinaan,
  deleteMentor,
  getAdminData,
  restoreBinaan,
  saveBinaan,
  saveIndicator,
  saveMentor,
  savePeriod,
} from "@/lib/admin.functions";
import {
  getAdminDashboard,
  getMentorHistory,
  resetMentorRecap,
  saveMentorRecapOverride,
} from "@/lib/recap.functions";
import { formatDisplayScore, formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel Admin — Mutabaah Guru" },
      { name: "description", content: "Kelola mentor, binaan, indikator, dan periode mutabaah." },
      { property: "og:title", content: "Panel Admin — Mutabaah Guru" },
      { property: "og:description", content: "Kelola data master dan pantau seluruh mentor." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();
  const fetchAccount = useServerFn(getMyAccount);

  const { data: accountData, isLoading: isAccountLoading } = useQuery({
    queryKey: ["my-account", session?.user?.id],
    queryFn: () => fetchAccount(),
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (!isAccountLoading && accountData && !accountData.isAdmin) {
      toast.error("Akses ditolak. Halaman Admin hanya untuk Admin Utama.");
      navigate({ to: "/dashboard", replace: true });
    }
  }, [accountData, isAccountLoading, navigate]);

  const fetchDashboard = useServerFn(getAdminDashboard);
  const fetchData = useServerFn(getAdminData);
  const saveOverrideFn = useServerFn(saveMentorRecapOverride);
  const resetRecapFn = useServerFn(resetMentorRecap);
  const fetchHistory = useServerFn(getMentorHistory);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"pekanan" | "bulanan" | "riwayat">("pekanan");
  const [viewingMentorHistory, setViewingMentorHistory] = useState<{ mentorId: string; mentorName: string } | null>(null);

  const [clientStore, setClientStore] = useState<MasterClientStore>(() => getClientMasterStore());

  useEffect(() => {
    const handleUpdate = () => {
      setClientStore(getClientMasterStore());
    };
    window.addEventListener("mutabaah_master_store_updated", handleUpdate);
    return () => window.removeEventListener("mutabaah_master_store_updated", handleUpdate);
  }, []);

  const dashboard = useQuery({
    queryKey: ["admin-dashboard", selectedPeriodId],
    queryFn: () => fetchDashboard({ data: selectedPeriodId ? { periodId: selectedPeriodId } : {} }),
    retry: false,
  });
  const master = useQuery({ queryKey: ["admin-data"], queryFn: () => fetchData() });

  const mergedPeriods = useMemo(() => {
    const map = new Map<string, any>();
    (clientStore.periods ?? []).forEach((p: any) => map.set(`${p.start_date}::${p.end_date}`, p));
    (master.data?.periods ?? []).forEach((p: any) => map.set(`${p.start_date}::${p.end_date}`, p));
    return Array.from(map.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [master.data?.periods, clientStore.periods]);

  const mergedMentors = useMemo(() => {
    const map = new Map<string, any>();
    (clientStore.mentors ?? []).forEach((m: any) => map.set((m.name || "").toLowerCase().trim(), m));
    (master.data?.mentors ?? []).forEach((m: any) => map.set((m.name || "").toLowerCase().trim(), m));
    return Array.from(map.values());
  }, [master.data?.mentors, clientStore.mentors]);

  const mergedBinaan = useMemo(() => {
    const map = new Map<string, any>();
    (clientStore.binaan ?? []).forEach((b: any) => map.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b));
    (master.data?.binaan ?? []).forEach((b: any) => map.set(`${(b.name || "").toLowerCase().trim()}::${b.mentor_id}`, b));
    return Array.from(map.values());
  }, [master.data?.binaan, clientStore.binaan]);

  const mergedIndicators = useMemo(() => {
    const map = new Map<string, any>();
    (clientStore.indicators ?? []).forEach((i: any) => map.set((i.code || "").toUpperCase().trim(), i));
    (master.data?.indicators ?? []).forEach((i: any) => map.set((i.code || "").toUpperCase().trim(), i));
    return Array.from(map.values()).sort((a, b) => (a.order_number || 0) - (b.order_number || 0));
  }, [master.data?.indicators, clientStore.indicators]);

  const historyQuery = useQuery({
    queryKey: ["mentor-history", viewingMentorHistory?.mentorId],
    queryFn: () => fetchHistory({ data: { mentorId: viewingMentorHistory!.mentorId } }),
    enabled: Boolean(viewingMentorHistory?.mentorId),
  });

  // Recap Edit & Reset States
  const [editingRecap, setEditingRecap] = useState<any | null>(null);
  const [editOverrideMode, setEditOverrideMode] = useState<"auto" | "override">("auto");
  const [editWeeklyScore, setEditWeeklyScore] = useState<string>("0");
  const [editMonthlyScore, setEditMonthlyScore] = useState<string>("0");

  const [resettingRecap, setResettingRecap] = useState<any | null>(null);
  const [resetScope, setResetScope] = useState<"weekly" | "monthly" | "all">("weekly");
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);

  const saveOverrideMut = useMutation({
    mutationFn: (data: any) => saveOverrideFn({ data }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal menyimpan override.");
        return;
      }
      toast.success("Override rekap mentor berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-recap"] });
      setEditingRecap(null);
    },
    onError: () => toast.error("Gagal menyimpan override."),
  });

  const resetRecapMut = useMutation({
    mutationFn: (data: any) => resetRecapFn({ data }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal mereset rekap.");
        return;
      }
      toast.success("Rekap mentor berhasil di-reset.");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-recap"] });
      setResettingRecap(null);
      setConfirmingResetAll(false);
    },
    onError: () => toast.error("Gagal mereset rekap."),
  });

  if (dashboard.isLoading || master.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat data panel admin...
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <div className="surface-card p-6 sm:p-8 text-center space-y-4 max-w-md mx-auto my-12 border border-[#DCE9E1] rounded-2xl bg-white">
        <h2 className="text-lg font-bold text-[#173C32]">Akses Ditolak / Perlu Login</h2>
        <p className="text-xs sm:text-sm text-[#52635C]">
          Halaman Panel Admin ini memerlukan sesi login Admin yang valid.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link to="/login">
            <Button className="bg-[#006B54] hover:bg-[#005844] text-white">Ke Halaman Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const d = dashboard.data;
  if (!d) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <p className="text-sm">Menyiapkan data panel admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">Panel Admin Master</h1>
        <p className="text-xs sm:text-sm text-[#52635C] mt-0.5">
          {d.period
            ? `Periode aktif berjalan: ${formatPeriod(d.period.start_date, d.period.end_date)}`
            : "Belum ada periode aktif"}
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5">
        <Stat label="Mentor" value={String(d.stats.mentors)} icon={<Users className="h-4 w-4 text-[#006B54]" />} />
        <Stat label="Binaan" value={String(d.stats.binaan)} icon={<Users className="h-4 w-4 text-[#0F8A6A]" />} />
        <Stat label="Sudah Isi" value={String(d.stats.filled)} icon={<CheckCircle2 className="h-4 w-4 text-[#087443]" />} badgeClass="bg-[#E5F6EC] text-[#087443]" />
        <Stat label="Belum Isi" value={String(d.stats.missing)} icon={<AlertCircle className="h-4 w-4 text-[#B45309]" />} badgeClass="bg-[#FFF0E8] text-[#B45309]" />
        <Stat label="Rata-rata" value={formatDisplayScore(d.stats.average)} icon={<Award className="h-4 w-4 text-[#006B54]" />} />
      </div>

      {/* Rekap Mentor Master Table */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#173C32]">Rekapitulasi Mentor Master</h2>
            <p className="text-xs text-[#52635C]">
              {selectedPeriodId && d.periods.find((p) => p.id === selectedPeriodId)
                ? `Periode: ${formatPeriod(
                    d.periods.find((p) => p.id === selectedPeriodId)!.start_date,
                    d.periods.find((p) => p.id === selectedPeriodId)!.end_date,
                  )}`
                : "Periode Aktif Berjalan"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-[#DCE9E1] bg-white p-0.5 text-xs">
              <button
                type="button"
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === "pekanan" ? "bg-[#006B54] text-white font-semibold" : "text-[#52635C] hover:text-[#173C32]"
                }`}
                onClick={() => setViewMode("pekanan")}
              >
                Pekanan
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === "bulanan" ? "bg-[#006B54] text-white font-semibold" : "text-[#52635C] hover:text-[#173C32]"
                }`}
                onClick={() => setViewMode("bulanan")}
              >
                Bulanan
              </button>
              <button
                type="button"
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === "riwayat" ? "bg-[#006B54] text-white font-semibold" : "text-[#52635C] hover:text-[#173C32]"
                }`}
                onClick={() => setViewMode("riwayat")}
              >
                Riwayat
              </button>
            </div>

            <Select value={selectedPeriodId ?? d.period?.id ?? ""} onValueChange={(v) => setSelectedPeriodId(v)}>
              <SelectTrigger className="w-full sm:w-48 h-9 text-xs bg-white border-[#DCE9E1]">
                <SelectValue placeholder="Pilih Periode" />
              </SelectTrigger>
              <SelectContent>
                {mergedPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatPeriod(p.start_date, p.end_date)}
                    {p.status === "active" ? " (Aktif)" : p.status === "closed" ? " (Selesai)" : " (Nonaktif)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[50rem] text-sm">
            <thead className="bg-[#EAF4EE]/60 text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-4 py-3">Mentor</th>
                <th className="px-4 py-3 text-center">Binaan</th>
                {viewMode === "pekanan" && (
                  <>
                    <th className="px-4 py-3 text-center">Sudah</th>
                    <th className="px-4 py-3 text-center">Belum</th>
                    <th className="px-4 py-3 text-center">Pekanan</th>
                    <th className="px-4 py-3 text-center">Bulanan</th>
                  </>
                )}
                {viewMode === "bulanan" && (
                  <>
                    <th className="px-4 py-3 text-center">Rata-rata Bulanan</th>
                  </>
                )}
                {viewMode === "riwayat" && (
                  <>
                    <th className="px-4 py-3 text-center">Nilai Pekan Ini</th>
                    <th className="px-4 py-3 text-center">Rata-rata Bulanan</th>
                  </>
                )}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1] bg-white">
              {d.summaries.map((s) => (
                <tr key={s.mentorId} className="hover:bg-[#F5FAF7] transition-colors">
                  <td className="px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewingMentorHistory({ mentorId: s.mentorId, mentorName: s.mentorName })}
                      className="text-[#006B54] hover:underline text-left cursor-pointer font-bold"
                    >
                      {s.mentorName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-xs font-semibold text-[#173C32]">{s.binaanCount}</td>

                  {viewMode === "pekanan" && (
                    <>
                      <td className="px-4 py-3 text-center tabular-nums text-xs font-semibold text-[#087443]">{s.filled}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-xs font-semibold text-[#B45309]">{s.missing}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <div className="font-bold text-[#006B54]">{formatDisplayScore(s.weeklyScore)}</div>
                        <div className="text-[10px] leading-none mt-0.5 font-normal">
                          {s.isOverride ? (
                            <span className="text-amber-600 font-semibold">Manual</span>
                          ) : (
                            <span className="text-[#087443]">Otomatis</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        <div className="font-bold text-[#0F8A6A]">{formatDisplayScore(s.monthlyScore)}</div>
                        <div className="text-[10px] leading-none mt-0.5 font-normal">
                          {s.isOverride ? (
                            <span className="text-amber-600 font-semibold">Manual</span>
                          ) : (
                            <span className="text-[#087443]">Otomatis</span>
                          )}
                        </div>
                      </td>
                    </>
                  )}

                  {viewMode === "bulanan" && (
                    <td className="px-4 py-3 text-center font-bold text-base tabular-nums text-[#006B54]">
                      {formatDisplayScore(s.monthlyScore)}
                    </td>
                  )}

                  {viewMode === "riwayat" && (
                    <>
                      <td className="px-4 py-3 text-center font-bold tabular-nums text-[#006B54]">{formatDisplayScore(s.weeklyScore)}</td>
                      <td className="px-4 py-3 text-center font-bold tabular-nums text-[#0F8A6A]">{formatDisplayScore(s.monthlyScore)}</td>
                    </>
                  )}

                  <td className="px-4 py-3">
                    <ScoreBadge score={s.weeklyScore} />
                  </td>
                  <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs font-semibold border-[#CFE4D8] text-[#006B54] hover:bg-[#EAF4EE]"
                      onClick={() => {
                        setEditingRecap(s);
                        setEditOverrideMode(s.isOverride ? "override" : "auto");
                        setEditWeeklyScore(String(s.weeklyScore ?? 0));
                        setEditMonthlyScore(String(s.monthlyScore ?? 0));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2.5 text-xs font-semibold bg-[#D92D20] hover:bg-[#B42318] text-white"
                      onClick={() => {
                        setResettingRecap(s);
                        setResetScope("weekly");
                      }}
                    >
                      Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs Management Section */}
      <Tabs defaultValue="mentor" className="space-y-4">
        <TabsList className="bg-[#EAF4EE] p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="mentor" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white">Mentor</TabsTrigger>
          <TabsTrigger value="binaan" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white">Binaan</TabsTrigger>
          <TabsTrigger value="indikator" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white">Indikator</TabsTrigger>
          <TabsTrigger value="periode" className="text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white">Periode</TabsTrigger>
        </TabsList>

        <TabsContent value="mentor" className="pt-2">
          <MentorSection rows={mergedMentors} binaan={mergedBinaan} />
        </TabsContent>
        <TabsContent value="binaan" className="pt-2">
          <BinaanSection rows={mergedBinaan} mentors={mergedMentors} />
        </TabsContent>
        <TabsContent value="indikator" className="pt-2">
          <IndicatorSection rows={mergedIndicators} />
        </TabsContent>
        <TabsContent value="periode" className="pt-2">
          <PeriodSection rows={mergedPeriods} />
        </TabsContent>
      </Tabs>

      {/* Mentor History Dialog */}
      <Dialog
        open={viewingMentorHistory !== null}
        onOpenChange={(open) => !open && setViewingMentorHistory(null)}
      >
        <DialogContent className="w-[92vw] sm:max-w-[32rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">RIWAYAT MUTABAAH: {viewingMentorHistory?.mentorName}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-[#52635C]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#006B54]" /> Memuat riwayat periode...
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#DCE9E1] rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
                    <tr>
                      <th className="px-3 py-2">Periode</th>
                      <th className="px-3 py-2 text-center">Status Periode</th>
                      <th className="px-3 py-2 text-center">Nilai Pekanan</th>
                      <th className="px-3 py-2">Predikat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE9E1] text-xs">
                    {(historyQuery.data?.history ?? []).map((h) => (
                      <tr key={h.periodId} className="hover:bg-[#F5FAF7]">
                        <td className="px-3 py-2 font-medium text-[#173C32]">
                          {formatPeriod(h.startDate, h.endDate)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant={
                              h.status === "active"
                                ? "default"
                                : h.status === "closed"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {h.status === "active"
                              ? "Aktif"
                              : h.status === "closed"
                              ? "Selesai"
                              : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums font-bold text-[#006B54]">
                          <div>{formatDisplayScore(h.score)}</div>
                          {h.isOverride && (
                            <div className="text-[9px] text-amber-600 font-normal">
                              Manual
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <ScoreBadge score={h.score} />
                        </td>
                      </tr>
                    ))}
                    {(historyQuery.data?.history ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-[#52635C] text-xs">
                          Belum ada riwayat periode.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingMentorHistory(null)} className="w-full sm:w-auto border-[#DCE9E1]">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rekap Mentor Dialog */}
      <Dialog open={editingRecap !== null} onOpenChange={(open) => !open && setEditingRecap(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">EDIT REKAP MENTOR</DialogTitle>
          </DialogHeader>
          {editingRecap && (
            <form
              className="space-y-4 py-2 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingRecap) return;
                saveOverrideMut.mutate({
                  mentorId: editingRecap.mentorId,
                  periodId: selectedPeriodId ?? d.period?.id,
                  isOverride: editOverrideMode === "override",
                  manualWeeklyScore: Number(editWeeklyScore) || 0,
                  manualMonthlyScore: Number(editMonthlyScore) || 0,
                });
              }}
            >
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#F5FAF7] p-3 rounded-xl border border-[#DCE9E1]">
                <div><span className="text-[#52635C]">Mentor:</span> <span className="font-semibold text-[#173C32]">{editingRecap.mentorName}</span></div>
                <div><span className="text-[#52635C]">Binaan:</span> <span className="font-semibold text-[#173C32]">{editingRecap.binaanCount}</span></div>
                <div><span className="text-[#52635C]">Sudah:</span> <span className="font-semibold text-[#087443]">{editingRecap.filled}</span></div>
                <div><span className="text-[#52635C]">Belum:</span> <span className="font-semibold text-[#B45309]">{editingRecap.missing}</span></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#173C32]">Mode Penilaian Rekap</Label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-[#DCE9E1] rounded-xl hover:bg-[#F5FAF7]">
                    <input
                      type="radio"
                      name="overrideMode"
                      value="auto"
                      checked={editOverrideMode === "auto"}
                      onChange={() => setEditOverrideMode("auto")}
                    />
                    <div>
                      <p className="font-semibold text-[#173C32]">Gunakan Hasil Otomatis</p>
                      <p className="text-[11px] text-[#52635C]">Perhitungan nilai dihitung otomatis dari submission data Mutabaah.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-[#DCE9E1] rounded-xl hover:bg-[#F5FAF7]">
                    <input
                      type="radio"
                      name="overrideMode"
                      value="override"
                      checked={editOverrideMode === "override"}
                      onChange={() => setEditOverrideMode("override")}
                    />
                    <div>
                      <p className="font-semibold text-[#173C32]">Override oleh Admin</p>
                      <p className="text-[11px] text-[#52635C]">Nilai rekap ditentukan secara manual oleh Admin.</p>
                    </div>
                  </label>
                </div>
              </div>

              {editOverrideMode === "override" && (
                <div className="space-y-3 pt-2 border-t border-[#DCE9E1]">
                  <div className="space-y-1">
                    <Label htmlFor="manual-weekly" className="text-xs font-semibold text-[#173C32]">Nilai Pekanan Manual (0-100)</Label>
                    <Input
                      id="manual-weekly"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={editWeeklyScore}
                      onChange={(e) => setEditWeeklyScore(e.target.value)}
                      className="min-h-[44px] bg-white border-[#D5E3DB]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-monthly" className="text-xs font-semibold text-[#173C32]">Nilai Bulanan Manual (0-100)</Label>
                    <Input
                      id="manual-monthly"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={editMonthlyScore}
                      onChange={(e) => setEditMonthlyScore(e.target.value)}
                      className="min-h-[44px] bg-white border-[#D5E3DB]"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingRecap(null)} className="w-full sm:w-auto border-[#DCE9E1]">
                  Batal
                </Button>
                <Button type="submit" disabled={saveOverrideMut.isPending} className="w-full sm:w-auto bg-[#006B54] hover:bg-[#005844] text-white">
                  {saveOverrideMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Rekap Mentor Dialog */}
      <Dialog open={resettingRecap !== null} onOpenChange={(open) => !open && setResettingRecap(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-destructive">RESET REKAP MENTOR</DialogTitle>
          </DialogHeader>
          {resettingRecap && (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-[#F5FAF7] p-3 rounded-xl border border-[#DCE9E1] text-xs space-y-1">
                <p><span className="text-[#52635C]">Mentor:</span> <span className="font-semibold text-[#173C32]">{resettingRecap.mentorName}</span></p>
                <p><span className="text-[#52635C]">Binaan Terhubung:</span> <span className="font-semibold text-[#173C32]">{resettingRecap.binaanCount} orang</span></p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#173C32]">Pilih Scope Reset</Label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-[#DCE9E1] rounded-xl hover:bg-[#F5FAF7]">
                    <input
                      type="radio"
                      name="resetScope"
                      value="weekly"
                      checked={resetScope === "weekly"}
                      onChange={() => setResetScope("weekly")}
                    />
                    <div>
                      <p className="font-semibold text-[#173C32]">Reset Mingguan (Pekan Terpilih)</p>
                      <p className="text-[11px] text-[#52635C]">Mengembalikan nilai pekanan ke otomatis / 0 untuk pekan terpilih saja.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-[#DCE9E1] rounded-xl hover:bg-[#F5FAF7]">
                    <input
                      type="radio"
                      name="resetScope"
                      value="monthly"
                      checked={resetScope === "monthly"}
                      onChange={() => setResetScope("monthly")}
                    />
                    <div>
                      <p className="font-semibold text-[#173C32]">Reset Bulanan (Bulan Ini)</p>
                      <p className="text-[11px] text-[#52635C]">Mereset rekap mutabaah bulan berjalan untuk mentor ini.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer p-2.5 border border-[#DCE9E1] rounded-xl hover:bg-[#F5FAF7]">
                    <input
                      type="radio"
                      name="resetScope"
                      value="all"
                      checked={resetScope === "all"}
                      onChange={() => setResetScope("all")}
                    />
                    <div>
                      <p className="font-semibold text-destructive">Reset Semua Rekap</p>
                      <p className="text-[11px] text-[#52635C]">Mereset seluruh data rekap mutabaah mentor & binaannya.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-[#E5F6EC] text-[#087443] rounded-xl text-xs space-y-1 border border-[#B7E8CB]">
                <p className="font-semibold">✓ Yang TIDAK akan terhapus:</p>
                <p className="text-[11px]">Akun Mentor, Data Binaan, Mapping Mentor-Binaan, dan Riwayat Identitas tetap 100% aman.</p>
              </div>

              <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setResettingRecap(null)} className="w-full sm:w-auto border-[#DCE9E1]">
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B42318] text-white"
                  onClick={() => {
                    if (resetScope === "all") {
                      setConfirmingResetAll(true);
                    } else {
                      resetRecapMut.mutate({
                        mentorId: resettingRecap.mentorId,
                        scope: resetScope,
                        periodId: selectedPeriodId ?? d.period?.id,
                      });
                    }
                  }}
                  disabled={resetRecapMut.isPending}
                >
                  {resetRecapMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Reset Rekap
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Double Confirmation AlertDialog for Reset All */}
      <AlertDialog open={confirmingResetAll} onOpenChange={setConfirmingResetAll}>
        <AlertDialogContent className="w-[92vw] sm:max-w-[28rem] border border-[#DCE9E1] rounded-2xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold text-base sm:text-lg">PERINGATAN KERAS — CONFIRM RESET ALL</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-[#52635C]">
              Apakah Anda benar-benar yakin ingin mereset seluruh rekap data Mutabaah untuk Mentor{" "}
              <strong className="text-[#173C32]">{resettingRecap?.mentorName}</strong> ({resettingRecap?.binaanCount} Binaan)?
              <br /><br />
              Seluruh data rekap mutabaah akan dibersihkan, tetapi akun Mentor dan daftar Binaan TIDAK AKAN terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto border-[#DCE9E1]">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B42318] text-white font-semibold"
              onClick={() => {
                if (!resettingRecap) return;
                resetRecapMut.mutate({
                  mentorId: resettingRecap.mentorId,
                  scope: "all",
                  periodId: selectedPeriodId ?? d.period?.id,
                });
              }}
            >
              Ya, Reset Seluruh Rekap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, icon, badgeClass }: { label: string; value: string; icon?: React.ReactNode; badgeClass?: string }) {
  return (
    <div className="surface-card p-3.5 sm:p-4 border border-[#DCE9E1] rounded-2xl bg-white shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-[11px] sm:text-xs font-semibold text-[#52635C] uppercase tracking-wider">{label}</p>
        {icon && <div className={`p-1.5 rounded-lg ${badgeClass ?? "bg-[#EAF4EE]"}`}>{icon}</div>}
      </div>
      <p className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums text-[#173C32]">{value}</p>
    </div>
  );
}

function useSaver(fn: any, keys: string[], onStoreUpdate?: (res: any, vars: any) => void) {
  const queryClient = useQueryClient();
  const call = useServerFn(fn);
  return useMutation({
    mutationFn: (data: any) => call({ data }),
    onSuccess: (result: any, variables: any) => {
      if (result?.ok === false) {
        toast.error(result.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success("Data tersimpan.");
      if (onStoreUpdate) onStoreUpdate(result, variables);
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: () => toast.error("Gagal menyimpan data."),
  });
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 sm:p-5 space-y-4 border border-[#DCE9E1] rounded-2xl bg-white">
      <h2 className="text-sm sm:text-base font-bold text-[#173C32]">{title}</h2>
      {children}
    </div>
  );
}

function MentorSection({ rows, binaan }: { rows: any[]; binaan: any[] }) {
  const queryClient = useQueryClient();
  const save = useSaver(saveMentor, ["admin-data", "admin-dashboard", "admin-mentors"], (res, vars) => {
    updateClientMasterStore("mentors", "upsert", {
      id: res?.mentor?.id ?? vars.id ?? `a1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
      name: vars.name,
      username: vars.username,
      status: vars.status ?? "active",
    });
  });
  const del = useSaver(deleteMentor, ["admin-data", "admin-dashboard", "admin-mentors"], (res, vars) => {
    updateClientMasterStore("mentors", "delete", { id: vars.id });
  });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editingMentor, setEditingMentor] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const [viewingMentor, setViewingMentor] = useState<any | null>(null);
  const [deletingMentor, setDeletingMentor] = useState<any | null>(null);

  const deleteMentorMut = useMutation({
    mutationFn: (id: string) => del.mutateAsync({ id }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal menghapus mentor.");
        return;
      }
      if (res?.mode === "soft") {
        toast.success("Mentor dinonaktifkan karena masih memiliki binaan.");
      } else {
        toast.success("Mentor berhasil dihapus.");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-mentors"] });
      setDeletingMentor(null);
    },
    onError: () => toast.error("Gagal menghapus mentor."),
  });

  const openEditModal = (m: any) => {
    setEditingMentor(m);
    setEditName(m.name);
    setEditUsername(m.username ?? (m.email ? m.email.split("@")[0] : ""));
    setEditPassword("");
    setEditStatus(m.status === "active" ? "active" : "inactive");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-[20rem_1fr]">
        <Panel title="Tambah Mentor Master">
          <form
            className="space-y-3 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                name,
                username: username || null,
                email: email || null,
                password: password || null,
                status: "active",
              });
              setName("");
              setUsername("");
              setEmail("");
              setPassword("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="m-name" className="text-xs font-semibold text-[#173C32]">Nama Mentor</Label>
              <Input
                id="m-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Abi Azam"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-username" className="text-xs font-semibold text-[#173C32]">Username (login mentor)</Label>
              <Input
                id="m-username"
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: abi_azam"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email" className="text-xs font-semibold text-[#173C32]">Email (opsional)</Label>
              <Input
                id="m-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh: azam@mutabaah.sch.id"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-password" className="text-xs font-semibold text-[#173C32]">Password Baru</Label>
              <Input
                id="m-password"
                type="password"
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password login mentor"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-11">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan Mentor
            </Button>
          </form>
        </Panel>

        <Panel title="Daftar Mentor Master">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[28rem]">
              <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
                <tr>
                  <th className="px-3 py-2 text-right w-12">No</th>
                  <th className="px-3 py-2">Nama Mentor</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Binaan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE9E1]">
                {rows.map((m, i) => {
                  const count = binaan.filter((b) => b.mentor_id === m.id).length;
                  return (
                    <tr key={m.id} className="hover:bg-[#F5FAF7]">
                      <td className="px-3 py-2 text-right tabular-nums text-[#52635C] text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#173C32]">{m.name}</td>
                      <td className="px-3 py-2 text-xs text-[#52635C]">
                        {m.username ?? (m.email ? m.email.split("@")[0] : "-")}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setViewingMentor(m)}
                          className="inline-flex items-center gap-1 font-bold text-[#006B54] hover:underline cursor-pointer"
                        >
                          <span>{count} orang</span>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-xs bg-[#E5F6EC] text-[#087443] border-[#B7E8CB]">
                          {m.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-semibold text-[#006B54]"
                          onClick={() => openEditModal(m)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs font-semibold text-destructive hover:text-destructive"
                          onClick={() => setDeletingMentor(m)}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Viewing Mentor Detail Dialog */}
      <Dialog open={viewingMentor !== null} onOpenChange={(open) => !open && setViewingMentor(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Binaan Terhubung: {viewingMentor?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {viewingMentor && (() => {
              const mBinaan = binaan.filter((b) => b.mentor_id === viewingMentor.id);
              if (mBinaan.length === 0) {
                return <p className="text-xs text-[#52635C]">Belum ada binaan terikat untuk mentor ini.</p>;
              }
              return (
                <div className="overflow-x-auto border border-[#DCE9E1] rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
                      <tr>
                        <th className="px-3 py-2 text-right w-10">No</th>
                        <th className="px-3 py-2">Nama Binaan</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE9E1]">
                      {mBinaan.map((b, i) => (
                        <tr key={b.id}>
                          <td className="px-3 py-2 text-right tabular-nums text-[#52635C] text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-[#173C32]">{b.name}</td>
                          <td className="px-3 py-2">
                            <Badge variant={b.status === "active" ? "default" : "secondary"} className="text-xs">
                              {b.status === "active" ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingMentor(null)} className="w-full sm:w-auto border-[#DCE9E1]">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mentor Dialog */}
      <Dialog open={editingMentor !== null} onOpenChange={(open) => !open && setEditingMentor(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Edit Mentor: {editingMentor?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingMentor) return;
              save.mutate({
                id: editingMentor.id,
                name: editName,
                username: editUsername || null,
                password: editPassword || null,
                status: editStatus,
              });
              setEditingMentor(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-name" className="text-xs font-semibold text-[#173C32]">Nama Mentor</Label>
              <Input
                id="m-edit-name"
                required
                maxLength={100}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-username" className="text-xs font-semibold text-[#173C32]">Username (login mentor)</Label>
              <Input
                id="m-edit-username"
                maxLength={50}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="contoh: abi_azam"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-password" className="text-xs font-semibold text-[#173C32]">Password Baru (opsional)</Label>
              <Input
                id="m-edit-password"
                type="password"
                maxLength={72}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diubah"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#173C32]">Status Mentor</Label>
              <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                <SelectTrigger className="w-full min-h-[44px] bg-white border-[#D5E3DB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingMentor(null)} className="w-full sm:w-auto border-[#DCE9E1]">
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto bg-[#006B54] hover:bg-[#005844] text-white font-semibold">
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Mentor Confirmation AlertDialog */}
      <AlertDialog open={deletingMentor !== null} onOpenChange={(open) => !open && setDeletingMentor(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-[28rem] border border-[#DCE9E1] rounded-2xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Hapus Mentor {deletingMentor?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-[#52635C]">
              Jika mentor ini masih memiliki data binaan, sistem akan secara otomatis mengubah statusnya menjadi
              <strong className="text-[#173C32]"> nonaktif</strong> (soft delete) untuk melindungi integritas data binaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto border-[#DCE9E1]">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B42318] text-white font-semibold"
              onClick={() => deletingMentor && deleteMentorMut.mutate(deletingMentor.id)}
            >
              Hapus / Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BinaanSection({ rows, mentors }: { rows: any[]; mentors: any[] }) {
  const queryClient = useQueryClient();
  const save = useSaver(saveBinaan, ["admin-data", "admin-dashboard", "admin-mentors"], (res, vars) => {
    updateClientMasterStore("binaan", "upsert", {
      id: vars.id ?? `b1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
      name: vars.name,
      mentor_id: vars.mentor_id,
      phone: vars.phone,
      status: vars.status ?? "active",
    });
  });
  const del = useSaver(deleteBinaan, ["admin-data", "admin-dashboard", "admin-mentors"], (res, vars) => {
    updateClientMasterStore("binaan", "delete", { id: vars.id });
  });
  const restore = useSaver(restoreBinaan, ["admin-data", "admin-dashboard", "admin-mentors"], (res, vars) => {
    updateClientMasterStore("binaan", "upsert", { id: vars.id, status: "active" });
  });

  const [name, setName] = useState("");
  const [mentorId, setMentorId] = useState<string>("");

  const [editingBinaan, setEditingBinaan] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editMentorId, setEditMentorId] = useState("");

  const [deletingBinaan, setDeletingBinaan] = useState<any | null>(null);

  const deleteBinaanMut = useMutation({
    mutationFn: (id: string) => del.mutateAsync({ id }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal menghapus binaan.");
        return;
      }
      if (res?.mode === "soft") {
        toast.success("Binaan dinonaktifkan karena memiliki riwayat mutabaah.");
      } else {
        toast.success("Binaan berhasil dihapus.");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setDeletingBinaan(null);
    },
    onError: () => toast.error("Gagal menghapus binaan."),
  });

  const openEditModal = (b: any) => {
    setEditingBinaan(b);
    setEditName(b.name);
    setEditMentorId(b.mentor_id ?? "");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-[20rem_1fr]">
        <Panel title="Tambah Binaan Master">
          <form
            className="space-y-3 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!mentorId) {
                toast.error("Pilih mentor terlebih dahulu.");
                return;
              }
              save.mutate({ name, mentor_id: mentorId, status: "active" });
              setName("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="b-name" className="text-xs font-semibold text-[#173C32]">Nama Binaan</Label>
              <Input
                id="b-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Abi Erle"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-mentor" className="text-xs font-semibold text-[#173C32]">Mentor Pengampu</Label>
              <Select value={mentorId} onValueChange={(val: any) => setMentorId(val)}>
                <SelectTrigger id="b-mentor" className="w-full min-h-[44px] bg-white border-[#D5E3DB]">
                  <SelectValue placeholder="Pilih Mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-11">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan Binaan
            </Button>
          </form>
        </Panel>

        <Panel title="Daftar Binaan Master">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[28rem]">
              <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
                <tr>
                  <th className="px-3 py-2 text-right w-12">No</th>
                  <th className="px-3 py-2">Nama Binaan</th>
                  <th className="px-3 py-2">Mentor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE9E1]">
                {rows.map((b, i) => {
                  const mentor = mentors.find((m) => m.id === b.mentor_id);
                  const isDeleted = b.status === "inactive" || Boolean(b.deleted_at);

                  return (
                    <tr key={b.id} className={isDeleted ? "opacity-60 bg-muted/20" : "hover:bg-[#F5FAF7]"}>
                      <td className="px-3 py-2 text-right tabular-nums text-[#52635C] text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[#173C32]">{b.name}</td>
                      <td className="px-3 py-2 text-xs text-[#52635C]">{mentor?.name ?? "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={isDeleted ? "secondary" : "default"} className="text-xs">
                          {isDeleted ? "Nonaktif" : "Aktif"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                        {isDeleted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs font-semibold border-[#DCE9E1]"
                            onClick={() => restore.mutate({ id: b.id })}
                          >
                            Aktifkan
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-semibold text-[#006B54]"
                              onClick={() => openEditModal(b)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-semibold text-destructive hover:text-destructive"
                              onClick={() => setDeletingBinaan(b)}
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Edit Binaan Dialog */}
      <Dialog open={editingBinaan !== null} onOpenChange={(open) => !open && setEditingBinaan(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Edit Binaan: {editingBinaan?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingBinaan) return;
              save.mutate({
                id: editingBinaan.id,
                name: editName,
                mentor_id: editMentorId,
              });
              setEditingBinaan(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="b-edit-name" className="text-xs font-semibold text-[#173C32]">Nama Binaan</Label>
              <Input
                id="b-edit-name"
                required
                maxLength={100}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-edit-mentor" className="text-xs font-semibold text-[#173C32]">Mentor Pengampu</Label>
              <Select value={editMentorId} onValueChange={(val: any) => setEditMentorId(val)}>
                <SelectTrigger id="b-edit-mentor" className="w-full min-h-[44px] bg-white border-[#D5E3DB]">
                  <SelectValue placeholder="Pilih Mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingBinaan(null)} className="w-full sm:w-auto border-[#DCE9E1]">
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto bg-[#006B54] hover:bg-[#005844] text-white font-semibold">
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Binaan Confirmation AlertDialog */}
      <AlertDialog open={deletingBinaan !== null} onOpenChange={(open) => !open && setDeletingBinaan(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-[28rem] border border-[#DCE9E1] rounded-2xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Hapus Binaan {deletingBinaan?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-[#52635C]">
              Jika binaan ini sudah pernah mengisi mutabaah, sistem akan secara otomatis menyimpan statusnya sebagai
              <strong className="text-[#173C32]"> nonaktif</strong> untuk melindungi riwayat mutabaah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto border-[#DCE9E1]">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B42318] text-white font-semibold"
              onClick={() => deletingBinaan && deleteBinaanMut.mutate(deletingBinaan.id)}
            >
              Hapus / Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IndicatorSection({ rows }: { rows: any[] }) {
  const save = useSaver(saveIndicator, ["admin-data"], (res, vars) => {
    updateClientMasterStore("indicators", "upsert", {
      id: vars.id ?? `c1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
      code: vars.code,
      name: vars.name,
      target: vars.target,
      unit: vars.unit,
      order_number: vars.order_number,
      active: vars.active,
    });
  });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("7");
  const [unit, setUnit] = useState("kali");

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-[20rem_1fr]">
      <Panel title="Tambah Indikator Target">
        <form
          className="space-y-3 text-xs sm:text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              code,
              name,
              target: Number(target),
              unit,
              order_number: rows.length + 1,
              active: true,
            });
            setCode("");
            setName("");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="i-code" className="text-xs font-semibold text-[#173C32]">Kode</Label>
            <Input
              id="i-code"
              required
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="contoh: TAHAJUD"
              className="min-h-[44px] bg-white border-[#D5E3DB]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-name" className="text-xs font-semibold text-[#173C32]">Nama Indikator</Label>
            <Input
              id="i-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Sholat Tahajud"
              className="min-h-[44px] bg-white border-[#D5E3DB]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-target" className="text-xs font-semibold text-[#173C32]">Target</Label>
              <Input
                id="i-target"
                type="number"
                required
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-unit" className="text-xs font-semibold text-[#173C32]">Satuan</Label>
              <Input
                id="i-unit"
                required
                maxLength={20}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kali"
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-11">
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Simpan Indikator
          </Button>
        </form>
      </Panel>

      <Panel title="Daftar Indikator Target Master">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[28rem]">
            <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
              <tr>
                <th className="px-3 py-2">Urutan</th>
                <th className="px-3 py-2">Kode</th>
                <th className="px-3 py-2">Nama Indikator</th>
                <th className="px-3 py-2">Target Pekan</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#F5FAF7]">
                  <td className="px-3 py-2 tabular-nums text-xs font-medium text-[#52635C]">{row.order_number}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[#006B54] font-semibold">{row.code}</td>
                  <td className="px-3 py-2 font-semibold text-[#173C32]">{row.name}</td>
                  <td className="px-3 py-2 tabular-nums text-xs text-[#52635C]">
                    {row.target} {row.unit}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={row.active ? "default" : "secondary"} className="text-xs">
                      {row.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function PeriodSection({ rows }: { rows: any[] }) {
  const save = useSaver(savePeriod, ["admin-data", "admin-dashboard", "mentor-recap"], (res, vars) => {
    updateClientMasterStore("periods", vars.status === "active" ? "activate" : "upsert", {
      id: vars.id ?? `d1000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
      start_date: vars.start_date,
      end_date: vars.end_date,
      status: vars.status,
    });
  });
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("active");

  const [editingPeriod, setEditingPeriod] = useState<any | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const [activatingPeriod, setActivatingPeriod] = useState<any | null>(null);
  const activePeriod = rows.find((r) => r.status === "active");

  const openEditModal = (p: any) => {
    setEditingPeriod(p);
    setEditStart(p.start_date);
    setEditEnd(p.end_date);
    setEditStatus(p.status);
  };

  const handleActivateClick = (p: any) => {
    if (activePeriod && activePeriod.id !== p.id) {
      setActivatingPeriod(p);
    } else {
      save.mutate({ id: p.id, start_date: p.start_date, end_date: p.end_date, status: "active" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-[20rem_1fr]">
        <Panel title="Tambah Periode Pekanan">
          <form
            className="space-y-3 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ start_date: start, end_date: end, status });
              setStart("");
              setEnd("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="p-start" className="text-xs font-semibold text-[#173C32]">Tanggal Mulai</Label>
              <Input
                id="p-start"
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-end" className="text-xs font-semibold text-[#173C32]">Tanggal Selesai</Label>
              <Input
                id="p-end"
                type="date"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-status" className="text-xs font-semibold text-[#173C32]">Status Periode</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger id="p-status" className="w-full min-h-[44px] bg-white border-[#D5E3DB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">AKTIF (Pekan Berjalan)</SelectItem>
                  <SelectItem value="inactive">NONAKTIF</SelectItem>
                  <SelectItem value="closed">SELESAI (Ditutup)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-11">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan Periode Baru
            </Button>
          </form>
        </Panel>

        <Panel title="Daftar Periode Pekanan Master">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[28rem]">
              <thead className="border-b border-[#DCE9E1] bg-[#EAF4EE] text-xs font-semibold uppercase text-[#245347]">
                <tr>
                  <th className="px-3 py-2">Rentang Tanggal Pekan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE9E1]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F5FAF7]">
                    <td className="px-3 py-2 font-semibold text-[#173C32]">{formatPeriod(row.start_date, row.end_date)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          row.status === "active"
                            ? "default"
                            : row.status === "closed"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {row.status === "active"
                          ? "AKTIF"
                          : row.status === "closed"
                          ? "SELESAI"
                          : "NONAKTIF"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                      {row.status !== "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs font-semibold text-[#006B54] border-[#CFE4D8] hover:bg-[#EAF4EE]"
                          onClick={() => handleActivateClick(row)}
                        >
                          Aktifkan
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-semibold text-[#006B54]"
                        onClick={() => openEditModal(row)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Edit Periode Dialog */}
      <Dialog open={editingPeriod !== null} onOpenChange={(open) => !open && setEditingPeriod(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[28rem] max-h-[85vh] overflow-y-auto border border-[#DCE9E1] rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Edit Periode Pekanan</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2 text-xs sm:text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingPeriod) return;
              save.mutate({
                id: editingPeriod.id,
                start_date: editStart,
                end_date: editEnd,
                status: editStatus,
              });
              setEditingPeriod(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="p-edit-start" className="text-xs font-semibold text-[#173C32]">Tanggal Mulai</Label>
              <Input
                id="p-edit-start"
                type="date"
                required
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-edit-end" className="text-xs font-semibold text-[#173C32]">Tanggal Selesai</Label>
              <Input
                id="p-edit-end"
                type="date"
                required
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="min-h-[44px] bg-white border-[#D5E3DB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-edit-status" className="text-xs font-semibold text-[#173C32]">Status Periode</Label>
              <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                <SelectTrigger id="p-edit-status" className="w-full min-h-[44px] bg-white border-[#D5E3DB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">AKTIF (Pekan Berjalan)</SelectItem>
                  <SelectItem value="inactive">NONAKTIF</SelectItem>
                  <SelectItem value="closed">SELESAI (Ditutup)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingPeriod(null)} className="w-full sm:w-auto border-[#DCE9E1]">
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto bg-[#006B54] hover:bg-[#005844] text-white font-semibold">
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation for Single Active Period */}
      <AlertDialog open={activatingPeriod !== null} onOpenChange={(open) => !open && setActivatingPeriod(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-[28rem] border border-[#DCE9E1] rounded-2xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-[#173C32]">Konfirmasi Aktivasi Periode</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-[#52635C]">
              Periode <strong className="text-[#173C32]">{activePeriod ? formatPeriod(activePeriod.start_date, activePeriod.end_date) : ""}</strong> saat ini sedang AKTIF.
              <br /><br />
              Apakah Anda ingin menonaktifkan periode tersebut dan mengaktifkan periode{" "}
              <strong className="text-[#173C32]">{activatingPeriod ? formatPeriod(activatingPeriod.start_date, activatingPeriod.end_date) : ""}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto border-[#DCE9E1]">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-[#006B54] hover:bg-[#005844] text-white font-semibold"
              onClick={() => {
                if (!activatingPeriod) return;
                save.mutate({
                  id: activatingPeriod.id,
                  start_date: activatingPeriod.start_date,
                  end_date: activatingPeriod.end_date,
                  status: "active",
                });
                setActivatingPeriod(null);
              }}
            >
              Ya, Aktifkan Periode Ini
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}