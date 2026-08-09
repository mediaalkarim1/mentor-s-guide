import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, LogIn, Loader2, ShieldCheck } from "lucide-react";

import { getPublicFormData, submitMutabaah } from "@/lib/mutabaah.functions";
import { categoryFor, formatPeriod, optionsFor } from "@/lib/mutabaah-config";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SuccessState = {
  binaanName: string;
  mentorName: string;
  period: string;
  score: number;
};

export function MutabaahForm() {
  const loadData = useServerFn(getPublicFormData);
  const submitFn = useServerFn(submitMutabaah);

  const { data, isLoading } = useQuery({
    queryKey: ["public-form"],
    queryFn: () => loadData(),
  });

  const [binaanId, setBinaanId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [openBinaan, setOpenBinaan] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const binaanList = data?.binaan ?? [];
  const mentors = data?.mentors ?? [];
  const indicators = data?.indicators ?? [];
  const selectedBinaan = binaanList.find((b) => b.id === binaanId);

  const periodLabel = data?.period
    ? formatPeriod(data.period.start_date, data.period.end_date)
    : null;

  const mismatch = useMemo(
    () => Boolean(selectedBinaan && mentorId && selectedBinaan.mentor_id !== mentorId),
    [selectedBinaan, mentorId],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const entries = indicators.map((i) => ({
        indicatorId: i.id,
        realization: Number(values[i.id]),
      }));
      return submitFn({ data: { binaanId, mentorId, entries } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        const [start, end] = result.period.split("|");
        setSuccess({
          binaanName: result.binaanName,
          mentorName: result.mentorName,
          period: formatPeriod(start!, end!),
          score: result.score,
        });
        setError(null);
      } else {
        setError(result.error);
      }
    },
    onError: () => setError("Terjadi kesalahan. Silakan coba lagi."),
  });

  function handleSubmit() {
    setError(null);
    if (!binaanId) return setError("Silakan pilih nama Binaan dari daftar.");
    if (!mentorId) return setError("Silakan pilih Mentor.");
    if (mismatch)
      return setError(
        "Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.",
      );
    const missing = indicators.find((i) => values[i.id] === undefined || values[i.id] === "");
    if (missing) return setError(`Capaian "${missing.name}" belum diisi.`);
    mutation.mutate();
  }

  if (success) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-12">
        <div className="surface-card p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <Check className="h-7 w-7 text-success" />
          </div>
          <h1 className="mt-5 text-xl font-semibold">Alhamdulillah, Mutabaah berhasil disimpan.</h1>
          <dl className="mt-6 space-y-3 text-left text-sm">
            <Row label="Binaan" value={success.binaanName} />
            <Row label="Mentor" value={success.mentorName} />
            <Row label="Periode" value={success.period} />
            <Row label="Nilai" value={String(success.score)} />
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <ScoreBadge score={success.score} />
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            Nilai Anda otomatis masuk ke rekap Mentor {success.mentorName}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{categoryFor(success.score)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <header className="hero-gradient -mx-4 mb-8 px-6 py-10 text-center text-primary-foreground sm:rounded-b-3xl">
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground/90 hover:bg-white/10">
            <Link to="/auth">
              <LogIn className="mr-1.5 h-4 w-4" /> Login Mentor
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">MUTABAAH GURU</h1>
        <p className="mt-2 text-sm opacity-90">Pengisian Mutabaah Pekanan</p>
        {periodLabel && (
          <p className="mt-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
            Mutabaah Pekan {periodLabel}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat data...
        </div>
      ) : !data?.period ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">
          Belum ada periode mutabaah yang aktif. Silakan hubungi Admin.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="surface-card space-y-4 p-5">
            <div className="space-y-2">
              <Label>Nama Binaan</Label>
              <Popover open={openBinaan} onOpenChange={setOpenBinaan}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedBinaan ? selectedBinaan.name : "Cari & pilih nama Anda"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama..." />
                    <CommandList>
                      <CommandEmpty>Nama tidak terdaftar.</CommandEmpty>
                      <CommandGroup>
                        {binaanList.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={b.name}
                            onSelect={() => {
                              setBinaanId(b.id);
                              setOpenBinaan(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                b.id === binaanId ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {b.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Mentor</Label>
              <Select value={mentorId} onValueChange={setMentorId}>
                <SelectTrigger>
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
              {mismatch && (
                <p className="text-sm font-medium text-destructive">
                  Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang
                  benar.
                </p>
              )}
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Mutabaah Pekanan</h2>
              <p className="text-xs text-muted-foreground">
                Pilih capaian Anda pekan ini. Nilai dihitung otomatis oleh sistem.
              </p>
            </div>
            <div className="divide-y divide-border">
              {indicators.map((indicator, index) => (
                <div
                  key={indicator.id}
                  className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[2rem_1fr_7rem_12rem] sm:items-center sm:gap-4"
                >
                  <span className="hidden text-sm text-muted-foreground sm:block">{index + 1}</span>
                  <div>
                    <p className="font-medium">{indicator.name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Target: {indicator.target} {indicator.unit}
                    </p>
                  </div>
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {indicator.target} {indicator.unit}
                  </span>
                  <Select
                    value={values[indicator.id] ?? ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [indicator.id]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih capaian" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsFor(indicator.code, Number(indicator.target), indicator.unit).map(
                        (opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SUBMIT MUTABAAH
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Satu Binaan hanya dapat mengisi satu kali setiap pekan.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}