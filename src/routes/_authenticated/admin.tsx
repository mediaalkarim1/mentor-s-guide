import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminData,
  saveBinaan,
  saveIndicator,
  saveMentor,
  savePeriod,
} from "@/lib/admin.functions";
import { getAdminDashboard } from "@/lib/recap.functions";
import { formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";
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
          <MentorSection rows={master.data?.mentors ?? []} />
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

function MentorSection({ rows }: { rows: any[] }) {
  const save = useSaver(saveMentor, ["admin-data", "admin-dashboard", "admin-mentors"]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
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
            <Label htmlFor="m-name">Nama</Label>
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
      <Panel title="Daftar Mentor">
        <ul className="divide-y divide-border text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground">{m.email ?? "tanpa email"}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function BinaanSection({ rows, mentors }: { rows: any[]; mentors: any[] }) {
  const save = useSaver(saveBinaan, ["admin-data", "admin-dashboard"]);
  const [name, setName] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [phone, setPhone] = useState("");

  return (
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
            <Input id="b-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mentor</Label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mentor" />
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
          <div className="space-y-1.5">
            <Label htmlFor="b-phone">No. HP (opsional)</Label>
            <Input id="b-phone" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Simpan
          </Button>
        </form>
      </Panel>
      <Panel title="Daftar Binaan">
        <ul className="divide-y divide-border text-sm">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span className="font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground">
                {mentors.find((m) => m.id === b.mentor_id)?.name ?? "-"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
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