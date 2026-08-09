import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  resetMentorRecap,
  saveMentorRecapOverride,
} from "@/lib/recap.functions";
import { formatPeriod } from "@/lib/mutabaah-config";
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
  const fetchDashboard = useServerFn(getAdminDashboard);
  const fetchData = useServerFn(getAdminData);
  const saveOverrideFn = useServerFn(saveMentorRecapOverride);
  const resetRecapFn = useServerFn(resetMentorRecap);

  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard({ data: {} }),
    retry: false,
  });
  const master = useQuery({ queryKey: ["admin-data"], queryFn: () => fetchData() });

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
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat data panel admin...
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <div className="surface-card p-8 text-center space-y-4 max-w-md mx-auto my-12 border border-border rounded-xl">
        <h2 className="text-lg font-bold">Akses Ditolak / Perlu Login</h2>
        <p className="text-sm text-muted-foreground">
          Halaman Panel Admin ini memerlukan sesi login Admin yang valid.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link to="/login">
            <Button variant="default">Ke Halaman Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const d = dashboard.data;
  if (!d) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Menyiapkan data panel admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Admin</h1>
        <p className="text-sm text-muted-foreground">
          {d.period
            ? `Periode aktif ${formatPeriod(d.period.start_date, d.period.end_date)}`
            : "Belum ada periode"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Mentor" value={d.stats.mentors} />
        <Stat label="Binaan" value={d.stats.binaan} />
        <Stat label="Sudah Isi" value={d.stats.filled} />
        <Stat label="Belum Isi" value={d.stats.missing} />
        <Stat label="Rata-rata" value={d.stats.average} />
      </div>

      <div className="surface-card overflow-x-auto">
        <h2 className="border-b border-border px-4 py-3 text-base font-semibold">Rekap Mentor</h2>
        <table className="w-full min-w-[50rem] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mentor</th>
              <th className="px-4 py-3 text-center">Binaan</th>
              <th className="px-4 py-3 text-center">Sudah</th>
              <th className="px-4 py-3 text-center">Belum</th>
              <th className="px-4 py-3 text-center">Pekanan</th>
              <th className="px-4 py-3 text-center">Bulanan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.summaries.map((s) => (
              <tr key={s.mentorId} className="hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{s.mentorName}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.binaanCount}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.filled}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.missing}</td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <div className="font-semibold">{s.weeklyScore}</div>
                  <div className="text-[10px] leading-none mt-0.5 font-normal">
                    {s.isOverride ? (
                      <span className="text-amber-600 font-medium dark:text-amber-400">Manual Admin</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Otomatis</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center tabular-nums">
                  <div>{s.monthlyScore}</div>
                  <div className="text-[10px] leading-none mt-0.5 font-normal">
                    {s.isOverride ? (
                      <span className="text-amber-600 font-medium dark:text-amber-400">Manual Admin</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Otomatis</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={s.weeklyScore} />
                </td>
                <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-medium"
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
                    className="h-7 px-2.5 text-xs font-medium"
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

      <Tabs defaultValue="mentor">
        <TabsList>
          <TabsTrigger value="mentor">Mentor</TabsTrigger>
          <TabsTrigger value="binaan">Binaan</TabsTrigger>
          <TabsTrigger value="indikator">Indikator</TabsTrigger>
          <TabsTrigger value="periode">Periode</TabsTrigger>
        </TabsList>

        <TabsContent value="mentor" className="pt-4">
          <MentorSection rows={master.data?.mentors ?? []} binaan={master.data?.binaan ?? []} />
        </TabsContent>
        <TabsContent value="binaan" className="pt-4">
          <BinaanSection rows={master.data?.binaan ?? []} mentors={master.data?.mentors ?? []} />
        </TabsContent>
        <TabsContent value="indikator" className="pt-4">
          <IndicatorSection rows={master.data?.indicators ?? []} />
        </TabsContent>
        <TabsContent value="periode" className="pt-4">
          <PeriodSection rows={master.data?.periods ?? []} />
        </TabsContent>
      </Tabs>

      {/* Edit Rekap Mentor Dialog */}
      <Dialog open={editingRecap !== null} onOpenChange={(open) => !open && setEditingRecap(null)}>
        <DialogContent className="sm:max-w-[28rem]">
          <DialogHeader>
            <DialogTitle>EDIT REKAP MENTOR</DialogTitle>
          </DialogHeader>
          {editingRecap && (
            <form
              className="space-y-4 py-2 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingRecap) return;
                saveOverrideMut.mutate({
                  mentorId: editingRecap.mentorId,
                  isOverride: editOverrideMode === "override",
                  manualWeeklyScore: Number(editWeeklyScore) || 0,
                  manualMonthlyScore: Number(editMonthlyScore) || 0,
                });
              }}
            >
              <div className="grid grid-cols-2 gap-2 text-xs surface-card p-3 rounded-md border border-border">
                <div><span className="text-muted-foreground">Mentor:</span> <span className="font-semibold">{editingRecap.mentorName}</span></div>
                <div><span className="text-muted-foreground">Binaan:</span> <span className="font-semibold">{editingRecap.binaanCount}</span></div>
                <div><span className="text-muted-foreground">Sudah:</span> <span className="font-semibold">{editingRecap.filled}</span></div>
                <div><span className="text-muted-foreground">Belum:</span> <span className="font-semibold">{editingRecap.missing}</span></div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Mode Penilaian Rekap</Label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-md hover:bg-secondary/40">
                    <input
                      type="radio"
                      name="overrideMode"
                      value="auto"
                      checked={editOverrideMode === "auto"}
                      onChange={() => setEditOverrideMode("auto")}
                    />
                    <div>
                      <p className="font-medium">Gunakan Hasil Otomatis</p>
                      <p className="text-[11px] text-muted-foreground">Perhitungan nilai dihitung otomatis dari submission data Mutabaah.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-md hover:bg-secondary/40">
                    <input
                      type="radio"
                      name="overrideMode"
                      value="override"
                      checked={editOverrideMode === "override"}
                      onChange={() => setEditOverrideMode("override")}
                    />
                    <div>
                      <p className="font-medium">Override oleh Admin</p>
                      <p className="text-[11px] text-muted-foreground">Nilai rekap ditentukan secara manual oleh Admin.</p>
                    </div>
                  </label>
                </div>
              </div>

              {editOverrideMode === "override" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label htmlFor="manual-weekly">Nilai Pekanan Manual (0-100)</Label>
                    <Input
                      id="manual-weekly"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={editWeeklyScore}
                      onChange={(e) => setEditWeeklyScore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-monthly">Nilai Bulanan Manual (0-100)</Label>
                    <Input
                      id="manual-monthly"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={editMonthlyScore}
                      onChange={(e) => setEditMonthlyScore(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRecap(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={saveOverrideMut.isPending}>
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
        <DialogContent className="sm:max-w-[28rem]">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold">RESET REKAP MENTOR</DialogTitle>
          </DialogHeader>
          {resettingRecap && (
            <div className="space-y-4 py-2 text-sm">
              <div className="surface-card p-3 rounded-md border border-border text-xs space-y-1">
                <p><span className="text-muted-foreground">Mentor:</span> <span className="font-semibold">{resettingRecap.mentorName}</span></p>
                <p><span className="text-muted-foreground">Binaan Terhubung:</span> <span className="font-semibold">{resettingRecap.binaanCount} orang</span></p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pilih Periode Reset</Label>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-md hover:bg-secondary/40">
                    <input
                      type="radio"
                      name="resetScope"
                      value="weekly"
                      checked={resetScope === "weekly"}
                      onChange={() => setResetScope("weekly")}
                    />
                    <div>
                      <p className="font-medium">Reset Mingguan (Pekan Ini)</p>
                      <p className="text-[11px] text-muted-foreground">Mengembalikan nilai pekanan ke otomatis / 0 untuk pekan ini saja.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-md hover:bg-secondary/40">
                    <input
                      type="radio"
                      name="resetScope"
                      value="monthly"
                      checked={resetScope === "monthly"}
                      onChange={() => setResetScope("monthly")}
                    />
                    <div>
                      <p className="font-medium">Reset Bulanan (Bulan Ini)</p>
                      <p className="text-[11px] text-muted-foreground">Mereset rekap mutabaah bulan berjalan untuk mentor ini.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border border-border rounded-md hover:bg-secondary/40">
                    <input
                      type="radio"
                      name="resetScope"
                      value="all"
                      checked={resetScope === "all"}
                      onChange={() => setResetScope("all")}
                    />
                    <div>
                      <p className="font-medium text-destructive">Reset Semua Rekap</p>
                      <p className="text-[11px] text-muted-foreground">Mereset seluruh data rekap mutabaah mentor & binaannya.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-md text-xs space-y-1 border border-amber-200 dark:border-amber-800">
                <p className="font-semibold">✓ Yang TIDAK akan terhapus:</p>
                <p className="text-[11px]">Akun Mentor, Data Binaan, Mapping Mentor-Binaan, dan Riwayat Identitas tetap 100% aman.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setResettingRecap(null)}>
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (resetScope === "all") {
                      setConfirmingResetAll(true);
                    } else {
                      resetRecapMut.mutate({
                        mentorId: resettingRecap.mentorId,
                        scope: resetScope,
                        periodId: d.period?.id,
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-bold">PERINGATAN KERAS — CONFIRM RESET ALL</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda benar-benar yakin ingin mereset seluruh rekap data Mutabaah untuk Mentor{" "}
              <strong className="text-foreground">{resettingRecap?.mentorName}</strong> ({resettingRecap?.binaanCount} Binaan)?
              <br /><br />
              Seluruh data rekap mutabaah akan dibersihkan, tetapi akun Mentor dan daftar Binaan TIDAK AKAN terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (!resettingRecap) return;
                resetRecapMut.mutate({
                  mentorId: resettingRecap.mentorId,
                  scope: "all",
                  periodId: d.period?.id,
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

function Stat({ label, value }: { label: string | number; value: number }) {
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function useSaver(fn: any, keys: string[]) {
  const queryClient = useQueryClient();
  const call = useServerFn(fn);
  return useMutation({
    mutationFn: (data: any) => call({ data }),
    onSuccess: (result: any) => {
      if (result?.ok === false) {
        toast.error(result.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success("Data tersimpan.");
      keys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: () => toast.error("Gagal menyimpan data."),
  });
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-4 space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function MentorSection({ rows, binaan }: { rows: any[]; binaan: any[] }) {
  const queryClient = useQueryClient();
  const save = useSaver(saveMentor, ["admin-data", "admin-dashboard", "admin-mentors"]);
  const del = useSaver(deleteMentor, ["admin-data", "admin-dashboard", "admin-mentors"]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editingMentor, setEditingMentor] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
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
    setEditUsername(m.username ?? "");
    setEditEmail(m.email ?? "");
    setEditPassword("");
    setEditStatus(m.status === "active" ? "active" : "inactive");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        <Panel title="Tambah Mentor">
          <form
            className="space-y-3"
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
              <Label htmlFor="m-name">Nama Mentor</Label>
              <Input
                id="m-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Abi Azam"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-username">Username (login mentor)</Label>
              <Input
                id="m-username"
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: abi_azam"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email (opsional)</Label>
              <Input
                id="m-email"
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh: azam@mutabaah.sch.id"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-password">Password Baru</Label>
              <Input
                id="m-password"
                type="password"
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password login mentor"
              />
            </div>
            <Button type="submit" disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan Mentor
            </Button>
          </form>
        </Panel>

        <Panel title="Daftar Mentor Master">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right w-12">No</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Binaan</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((m, i) => {
                  const count = binaan.filter((b) => b.mentor_id === m.id).length;
                  return (
                    <tr key={m.id} className="hover:bg-secondary/20">
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.username ?? (m.email ? m.email.split("@")[0] : "-")}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <button
                          type="button"
                          onClick={() => setViewingMentor(m)}
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <span>{count} orang</span>
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-xs">
                          {m.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEditModal(m)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
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
        <DialogContent className="sm:max-w-[28rem]">
          <DialogHeader>
            <DialogTitle>Binaan: {viewingMentor?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {viewingMentor && (() => {
              const mBinaan = binaan.filter((b) => b.mentor_id === viewingMentor.id);
              if (mBinaan.length === 0) {
                return <p className="text-xs text-muted-foreground">Belum ada binaan untuk mentor ini.</p>;
              }
              return (
                <div className="overflow-x-auto border border-border rounded-md">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-right w-10">No</th>
                        <th className="px-3 py-2">Nama Binaan</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mBinaan.map((b, i) => (
                        <tr key={b.id}>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{b.name}</td>
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
            <Button variant="outline" onClick={() => setViewingMentor(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mentor Dialog */}
      <Dialog open={editingMentor !== null} onOpenChange={(open) => !open && setEditingMentor(null)}>
        <DialogContent className="sm:max-w-[28rem]">
          <DialogHeader>
            <DialogTitle>Edit Mentor: {editingMentor?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingMentor) return;
              save.mutate({
                id: editingMentor.id,
                name: editName,
                username: editUsername || null,
                email: editEmail || null,
                password: editPassword || null,
                status: editStatus,
              });
              setEditingMentor(null);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-name">Nama Mentor</Label>
              <Input
                id="m-edit-name"
                required
                maxLength={100}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-username">Username (login mentor)</Label>
              <Input
                id="m-edit-username"
                maxLength={50}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="contoh: abi_azam"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-email">Email (opsional)</Label>
              <Input
                id="m-edit-email"
                type="email"
                maxLength={255}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-edit-password">Password Baru (opsional)</Label>
              <Input
                id="m-edit-password"
                type="password"
                maxLength={72}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diubah"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMentor(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Mentor Confirmation AlertDialog */}
      <AlertDialog open={deletingMentor !== null} onOpenChange={(open) => !open && setDeletingMentor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Mentor {deletingMentor?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Jika mentor ini masih memiliki data binaan, sistem akan secara otomatis mengubah statusnya menjadi
              <strong> nonaktif</strong> (soft delete) untuk melindungi integritas data binaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
  const save = useSaver(saveBinaan, ["admin-data", "admin-dashboard", "admin-mentors"]);
  const del = useSaver(deleteBinaan, ["admin-data", "admin-dashboard", "admin-mentors"]);
  const restore = useSaver(restoreBinaan, ["admin-data", "admin-dashboard", "admin-mentors"]);

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
      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        <Panel title="Tambah Binaan">
          <form
            className="space-y-3"
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
              <Label htmlFor="b-name">Nama Binaan</Label>
              <Input
                id="b-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Abi Erle"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-mentor">Mentor</Label>
              <Select value={mentorId} onValueChange={(val: any) => setMentorId(val)}>
                <SelectTrigger id="b-mentor">
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
            <Button type="submit" disabled={save.isPending} className="w-full">
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan Binaan
            </Button>
          </form>
        </Panel>

        <Panel title="Daftar Binaan Master">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right w-12">No</th>
                  <th className="px-3 py-2">Nama Binaan</th>
                  <th className="px-3 py-2">Mentor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((b, i) => {
                  const mentor = mentors.find((m) => m.id === b.mentor_id);
                  const isDeleted = b.status === "inactive" || Boolean(b.deleted_at);

                  return (
                    <tr key={b.id} className={isDeleted ? "opacity-60 bg-muted/20" : "hover:bg-secondary/20"}>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium">{b.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{mentor?.name ?? "-"}</td>
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
                            className="h-7 px-2 text-xs"
                            onClick={() => restore.mutate({ id: b.id })}
                          >
                            Aktifkan
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEditModal(b)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
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
        <DialogContent className="sm:max-w-[28rem]">
          <DialogHeader>
            <DialogTitle>Edit Binaan: {editingBinaan?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2"
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
              <Label htmlFor="b-edit-name">Nama Binaan</Label>
              <Input
                id="b-edit-name"
                required
                maxLength={100}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-edit-mentor">Mentor</Label>
              <Select value={editMentorId} onValueChange={(val: any) => setEditMentorId(val)}>
                <SelectTrigger id="b-edit-mentor">
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
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingBinaan(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Binaan Confirmation AlertDialog */}
      <AlertDialog open={deletingBinaan !== null} onOpenChange={(open) => !open && setDeletingBinaan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Binaan {deletingBinaan?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Jika binaan ini sudah pernah mengisi mutabaah, sistem akan secara otomatis menyimpan statusnya sebagai
              <strong> nonaktif</strong> untuk melindungi riwayat mutabaah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
  const save = useSaver(saveIndicator, ["admin-data"]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("7");
  const [unit, setUnit] = useState("kali");

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <Panel title="Tambah Indikator">
        <form
          className="space-y-3"
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
            <Label htmlFor="i-code">Kode</Label>
            <Input
              id="i-code"
              required
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="contoh: TAHAJUD"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-name">Nama Indikator</Label>
            <Input
              id="i-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: Sholat Tahajud"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="i-target">Target</Label>
              <Input
                id="i-target"
                type="number"
                required
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i-unit">Satuan</Label>
              <Input
                id="i-unit"
                required
                maxLength={20}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kali"
              />
            </div>
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full">
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Simpan Indikator
          </Button>
        </form>
      </Panel>

      <Panel title="Daftar Indikator Target">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Urutan</th>
                <th className="px-3 py-2">Kode</th>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 tabular-nums">{row.order_number}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.target} {row.unit}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={row.active ? "default" : "secondary"}>
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
  const save = useSaver(savePeriod, ["admin-data", "admin-dashboard", "mentor-recap"]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("active");

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <Panel title="Tambah Periode Pekanan">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ start_date: start, end_date: end, status });
            setStart("");
            setEnd("");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="p-start">Tanggal Mulai</Label>
            <Input
              id="p-start"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-end">Tanggal Selesai</Label>
            <Input
              id="p-end"
              type="date"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-status">Status</Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger id="p-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif (Pekan Berjalan)</SelectItem>
                <SelectItem value="closed">Ditutup</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full">
            {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Simpan Periode
          </Button>
        </form>
      </Panel>

      <Panel title="Daftar Periode Pekanan">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Rentang Tanggal</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium">{formatPeriod(row.start_date, row.end_date)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {row.status === "active" ? "Aktif" : "Ditutup"}
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