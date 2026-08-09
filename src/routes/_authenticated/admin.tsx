import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteBinaan,
  getAdminData,
  restoreBinaan,
  saveBinaan,
  saveIndicator,
  saveMentor,
  savePeriod,
} from "@/lib/admin.functions";
import { getAdminDashboard } from "@/lib/recap.functions";
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
  const fetchDashboard = useServerFn(getAdminDashboard);
  const fetchData = useServerFn(getAdminData);

  const dashboard = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard({ data: {} }),
    retry: false,
  });
  const master = useQuery({ queryKey: ["admin-data"], queryFn: () => fetchData() });

  if (dashboard.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat panel admin...
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Halaman ini hanya untuk Admin.
      </div>
    );
  }

  const d = dashboard.data!;

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
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mentor</th>
              <th className="px-4 py-3 text-center">Binaan</th>
              <th className="px-4 py-3 text-center">Sudah</th>
              <th className="px-4 py-3 text-center">Belum</th>
              <th className="px-4 py-3 text-center">Pekanan</th>
              <th className="px-4 py-3 text-center">Bulanan</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {d.summaries.map((s) => (
              <tr key={s.mentorId}>
                <td className="px-4 py-3 font-medium">{s.mentorName}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.binaanCount}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.filled}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.missing}</td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums">{s.weeklyScore}</td>
                <td className="px-4 py-3 text-center tabular-nums">{s.monthlyScore}</td>
                <td className="px-4 py-3">
                  <ScoreBadge score={s.weeklyScore} />
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
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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
    <div className="surface-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function MentorSection({ rows, binaan }: { rows: any[]; binaan: any[] }) {
  const save = useSaver(saveMentor, ["admin-data", "admin-dashboard", "admin-mentors"]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [editingMentor, setEditingMentor] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const [viewingMentor, setViewingMentor] = useState<any | null>(null);

  const openEditModal = (m: any) => {
    setEditingMentor(m);
    setEditName(m.name);
    setEditEmail(m.email ?? "");
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
              save.mutate({ name, email: email || null, status: "active" });
              setName("");
              setEmail("");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Nama Mentor</Label>
              <Input id="m-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email (untuk login)</Label>
              <Input id="m-email" type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              Simpan
            </Button>
          </form>
        </Panel>
        <Panel title="Data Mentor">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right w-10">No</th>
                  <th className="px-3 py-2">Nama Mentor</th>
                  <th className="px-3 py-2">Email / Username</th>
                  <th className="px-3 py-2">Daftar Binaan</th>
                  <th className="px-3 py-2 text-center w-16">Jml</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((m, index) => {
                  const assignedBinaan = binaan.filter(
                    (b) => b.mentor_id === m.id && b.status === "active",
                  );
                  const binaanCount = assignedBinaan.length;
                  const isActive = m.status === "active";
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 align-top">
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="font-semibold text-primary hover:underline text-left"
                          onClick={() => setViewingMentor(m)}
                        >
                          {m.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {m.email ?? "tanpa email"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {binaanCount === 0 ? (
                          <span className="text-muted-foreground italic">Belum ada binaan</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {assignedBinaan.map((b) => (
                              <Badge key={b.id} variant="outline" className="text-[11px] font-normal py-0 px-1.5 bg-background">
                                {b.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                        <button
                          type="button"
                          className="hover:underline text-primary"
                          onClick={() => setViewingMentor(m)}
                        >
                          {binaanCount}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewingMentor(m)}>
                          Detail
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditModal(m)}>
                          Edit
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
                email: editEmail || null,
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
              <Label htmlFor="m-edit-email">Email / Username</Label>
              <Input
                id="m-edit-email"
                maxLength={255}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
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

            {editingMentor && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Daftar Binaan Terhubung ({binaan.filter((b) => b.mentor_id === editingMentor.id && b.status === "active").length}):
                </Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 rounded-md bg-muted/40 text-xs">
                  {binaan
                    .filter((b) => b.mentor_id === editingMentor.id && b.status === "active")
                    .map((b) => (
                      <Badge key={b.id} variant="secondary" className="text-[11px]">
                        {b.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMentor(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BinaanSection({ rows, mentors }: { rows: any[]; mentors: any[] }) {
  const queryClient = useQueryClient();
  const save = useSaver(saveBinaan, ["admin-data", "admin-dashboard", "mentor-recap"]);

  const deleteFn = useServerFn(deleteBinaan);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal menghapus binaan.");
        return;
      }
      toast.success(
        res?.mode === "soft"
          ? "Binaan dinonaktifkan (histori mutabaah tetap tersimpan)."
          : "Binaan berhasil dihapus.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-recap"] });
      setDeletingBinaan(null);
    },
    onError: () => toast.error("Gagal menghapus binaan."),
  });

  const restoreFn = useServerFn(restoreBinaan);
  const restoreMutation = useMutation({
    mutationFn: (data: { id: string; mentor_id?: string }) => restoreFn({ data }),
    onSuccess: (res: any) => {
      if (res?.ok === false) {
        toast.error(res.error ?? "Gagal mengaktifkan kembali binaan.");
        return;
      }
      toast.success("Binaan berhasil diaktifkan kembali.");
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-recap"] });
      setRestoringBinaan(null);
    },
    onError: () => toast.error("Gagal mengaktifkan kembali binaan."),
  });

  // State for Add form
  const [name, setName] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [phone, setPhone] = useState("");

  // State for Filter Mentor: "all" | mentorId
  const [mentorFilter, setMentorFilter] = useState<string>("all");

  // State for Filter Status: "active" (default) | "inactive" | "all"
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  // Edit Modal State
  const [editingBinaan, setEditingBinaan] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMentorId, setEditMentorId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  // Delete Dialog State
  const [deletingBinaan, setDeletingBinaan] = useState<any | null>(null);

  // Restore Modal State (when mentor is inactive)
  const [restoringBinaan, setRestoringBinaan] = useState<any | null>(null);
  const [restoreMentorId, setRestoreMentorId] = useState("");

  const activeMentors = mentors.filter((m) => m.status === "active");

  const filteredRows = rows.filter((b) => {
    if (statusFilter === "active" && b.status !== "active") return false;
    if (statusFilter === "inactive" && b.status === "active") return false;
    if (mentorFilter !== "all" && b.mentor_id !== mentorFilter) return false;
    return true;
  });

  const openEditModal = (b: any) => {
    setEditingBinaan(b);
    setEditName(b.name);
    setEditPhone(b.phone ?? "");
    setEditMentorId(b.mentor_id);
    setEditStatus(b.status === "active" ? "active" : "inactive");
  };

  const handleStartRestore = (b: any) => {
    const currentMentor = mentors.find((m) => m.id === b.mentor_id);
    if (currentMentor && currentMentor.status === "active") {
      restoreMutation.mutate({ id: b.id });
    } else {
      setRestoringBinaan(b);
      setRestoreMentorId(activeMentors[0]?.id ?? "");
    }
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
              save.mutate({ name, mentor_id: mentorId, phone: phone || null, status: "active" });
              setName("");
              setPhone("");
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
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mentor</Label>
              <Select value={mentorId} onValueChange={setMentorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mentor" />
                </SelectTrigger>
                <SelectContent>
                  {activeMentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-phone">No. HP (opsional)</Label>
              <Input
                id="b-phone"
                maxLength={30}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              Simpan
            </Button>
          </form>
        </Panel>

        <Panel title="Data Binaan">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter Mentor:</span>
              <Select value={mentorFilter} onValueChange={setMentorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Mentor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Mentor</SelectItem>
                  {activeMentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-right w-12">No</th>
                  <th className="px-3 py-2">Nama Binaan</th>
                  <th className="px-3 py-2">No. HP</th>
                  <th className="px-3 py-2">Mentor</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                      Tidak ada data binaan.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((b, index) => {
                    const mentorObj = mentors.find((m) => m.id === b.mentor_id);
                    const isActive = b.status === "active";
                    return (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{b.name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {b.phone ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {mentorObj?.name ?? "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={isActive ? "default" : "secondary"}>
                            {isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(b)}
                            >
                              Edit
                            </Button>
                            {!isActive && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={restoreMutation.isPending}
                                onClick={() => handleStartRestore(b)}
                              >
                                Aktifkan Kembali
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => setDeletingBinaan(b)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Edit Binaan Dialog */}
      <Dialog open={editingBinaan !== null} onOpenChange={(open) => !open && setEditingBinaan(null)}>
        <DialogContent className="sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle>Edit Binaan</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingBinaan) return;
              if (!editMentorId) {
                toast.error("Pilih mentor terlebih dahulu.");
                return;
              }
              save.mutate({
                id: editingBinaan.id,
                name: editName,
                phone: editPhone || null,
                mentor_id: editMentorId,
                status: editStatus,
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
              <Label htmlFor="b-edit-phone">No. HP (opsional)</Label>
              <Input
                id="b-edit-phone"
                maxLength={30}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mentor</Label>
              <Select value={editMentorId} onValueChange={setEditMentorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.status !== "active" ? "(Nonaktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editStatus}
                onValueChange={(val: any) => setEditStatus(val)}
              >
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
              <Button type="button" variant="outline" onClick={() => setEditingBinaan(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={save.isPending}>
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog Hapus Binaan */}
      <AlertDialog open={deletingBinaan !== null} onOpenChange={(open) => !open && setDeletingBinaan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Binaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-foreground">{deletingBinaan?.name}</span>?
              <br />
              <br />
              Data histori mutabaah yang sudah ada akan tetap disimpan untuk keperluan laporan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingBinaan?.id) {
                  deleteMutation.mutate(deletingBinaan.id);
                }
              }}
            >
              Hapus Binaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Mentor Selection Dialog (If previous mentor is inactive) */}
      <Dialog open={restoringBinaan !== null} onOpenChange={(open) => !open && setRestoringBinaan(null)}>
        <DialogContent className="sm:max-w-[26rem]">
          <DialogHeader>
            <DialogTitle>Aktifkan Kembali Binaan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Mentor sebelumnya ({mentors.find((m) => m.id === restoringBinaan?.mentor_id)?.name ?? "Tidak Ada"}) sudah tidak aktif. Silakan pilih Mentor yang aktif:
            </p>
            <div className="space-y-1.5">
              <Label>Pilih Mentor Aktif</Label>
              <Select value={restoreMentorId} onValueChange={setRestoreMentorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mentor" />
                </SelectTrigger>
                <SelectContent>
                  {activeMentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setRestoringBinaan(null)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={!restoreMentorId || restoreMutation.isPending}
              onClick={() => {
                if (restoringBinaan?.id && restoreMentorId) {
                  restoreMutation.mutate({
                    id: restoringBinaan.id,
                    mentor_id: restoreMentorId,
                  });
                }
              }}
            >
              Aktifkan Kembali
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndicatorSection({ rows }: { rows: any[] }) {
  const save = useSaver(saveIndicator, ["admin-data"]);

  return (
    <Panel title="Indikator Mutabaah">
      <ul className="divide-y divide-border text-sm">
        {rows.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="w-48 font-medium">{i.name}</span>
            <span className="text-xs text-muted-foreground">Satuan: {i.unit}</span>
            <Input
              type="number"
              min={1}
              max={1000}
              defaultValue={i.target}
              className="w-24"
              aria-label={`Target ${i.name}`}
              onBlur={(e) => {
                const target = Number(e.target.value);
                if (!target || target === Number(i.target)) return;
                save.mutate({ ...i, target });
              }}
            />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Ubah angka target lalu klik di luar kolom untuk menyimpan.
      </p>
    </Panel>
  );
}

function PeriodSection({ rows }: { rows: any[] }) {
  const save = useSaver(savePeriod, ["admin-data", "admin-dashboard", "mentor-recap", "monthly"]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <Panel title="Tambah Periode Pekanan">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ start_date: start, end_date: end, status: "active" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="p-start">Mulai</Label>
            <Input id="p-start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-end">Selesai</Label>
            <Input id="p-end" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Simpan &amp; Jadikan Aktif
          </Button>
        </form>
      </Panel>
      <Panel title="Daftar Periode">
        <ul className="divide-y divide-border text-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{formatPeriod(p.start_date, p.end_date)}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{p.status}</span>
                {p.status !== "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      save.mutate({
                        id: p.id,
                        start_date: p.start_date,
                        end_date: p.end_date,
                        status: "active",
                      })
                    }
                  >
                    Aktifkan
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}