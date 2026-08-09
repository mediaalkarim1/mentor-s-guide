import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, LogIn, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { getPublicFormData, submitMutabaah } from "@/lib/mutabaah.functions";
import { categoryFor, formatDisplayScore, formatPeriod, optionsFor } from "@/lib/mutabaah-config";
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
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
        <div className="surface-card p-6 sm:p-8 text-center border border-[#DCE9E1] rounded-2xl shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E5F6EC] text-[#087443]">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-lg sm:text-xl font-bold text-[#173C32]">Alhamdulillah, Mutabaah berhasil disimpan.</h1>
          <dl className="mt-6 space-y-3 text-left text-sm">
            <Row label="Binaan" value={success.binaanName} />
            <Row label="Mentor" value={success.mentorName} />
            <Row label="Periode" value={success.period} />
            <Row label="Nilai" value={formatDisplayScore(success.score)} />
            <div className="flex items-center justify-between gap-4 border-t border-[#DCE9E1] pt-3">
              <dt className="text-[#52635C]">Status Predikat</dt>
              <dd>
                <ScoreBadge score={success.score} />
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-xs sm:text-sm text-[#52635C]">
            Nilai Anda otomatis masuk ke rekapitulasi Mentor {success.mentorName}.
          </p>
          <div className="mt-6 pt-4 border-t border-[#DCE9E1]">
            <Button
              className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-11"
              onClick={() => {
                setSuccess(null);
                setValues({});
                setBinaanId("");
                setMentorId("");
              }}
            >
              Isi Mutabaah Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 pb-16">
      {/* Header Banner */}
      <header className="bg-gradient-to-b from-[#006B54] to-[#0F8A6A] -mx-3 sm:-mx-4 mb-6 px-4 py-8 sm:px-8 sm:py-10 text-center text-white sm:rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 backdrop-blur-xs px-3 py-1 rounded-full text-white/90">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Modern Islamic Education</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs h-8">
            <Link to="/login">
              <LogIn className="mr-1.5 h-3.5 w-3.5" /> Login Portal
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">MUTABAAH GURU</h1>
        <p className="mt-1 text-xs sm:text-sm opacity-90">Form Pengisian Capaian Amaliah Pekanan</p>
        {periodLabel && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs sm:text-sm font-medium border border-white/20">
            <span>Mutabaah Pekan: {periodLabel}</span>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[#52635C]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat form mutabaah...
        </div>
      ) : !data?.period ? (
        <div className="surface-card p-6 text-center text-sm text-[#52635C] border border-[#DCE9E1] rounded-xl">
          Belum ada periode mutabaah yang aktif. Silakan hubungi Admin.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Identity Selection Card */}
          <section className="surface-card p-4 sm:p-5 border border-[#DCE9E1] rounded-xl space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#31574B]">Nama Binaan</Label>
              <Popover open={openBinaan} onOpenChange={setOpenBinaan}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A] focus:ring-2 focus:ring-[#0F8A6A]/15 text-[#173C32]"
                  >
                    {selectedBinaan ? selectedBinaan.name : "Cari & pilih nama Binaan Anda..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama binaan..." />
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
                              // Auto-select mentor if linked
                              if (b.mentor_id) setMentorId(b.mentor_id);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-[#006B54]",
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#31574B]">Nama Mentor Pengampu</Label>
              <Select value={mentorId} onValueChange={setMentorId}>
                <SelectTrigger className="w-full min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A] text-[#173C32]">
                  <SelectValue placeholder="Pilih Nama Mentor" />
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
                <p className="text-xs font-medium text-destructive mt-1">
                  Mentor yang dipilih tidak sesuai dengan data Binaan. Silakan pilih Mentor yang benar.
                </p>
              )}
            </div>
          </section>

          {/* Indicators List */}
          <section className="surface-card overflow-hidden border border-[#DCE9E1] rounded-xl">
            <div className="border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3 sm:px-5 sm:py-4">
              <h2 className="text-sm sm:text-base font-bold text-[#173C32]">9 Indikator Mutabaah Pekanan</h2>
              <p className="text-xs text-[#52635C] mt-0.5">
                Pilih capaian realisasi Anda pekan ini. Nilai akhir dihitung otomatis.
              </p>
            </div>
            <div className="divide-y divide-[#DCE9E1] bg-white">
              {indicators.map((indicator, index) => (
                <div
                  key={indicator.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3.5 sm:grid-cols-[2rem_1fr_7rem_12rem] sm:items-center sm:gap-4 sm:px-5"
                >
                  <span className="hidden text-xs font-semibold text-[#52635C] sm:block">{index + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#173C32]">{indicator.name}</p>
                    <p className="text-xs text-[#52635C] sm:hidden mt-0.5">
                      Target: <span className="font-medium text-[#173C32]">{indicator.target} {indicator.unit}</span>
                    </p>
                  </div>
                  <span className="hidden text-xs text-[#52635C] sm:block">
                    Target: <strong className="text-[#173C32]">{indicator.target}</strong> {indicator.unit}
                  </span>
                  <Select
                    value={values[indicator.id] ?? ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [indicator.id]: v }))}
                  >
                    <SelectTrigger className="w-full min-h-[42px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A] text-xs font-medium text-[#173C32]">
                      <SelectValue placeholder="Pilih capaian pekan ini" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsFor(indicator.code, Number(indicator.target), indicator.unit).map(
                        (opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
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
            <div className="rounded-xl border border-destructive/30 bg-[#FDECEC] px-4 py-3 text-xs sm:text-sm font-medium text-[#B42318]">
              {error}
            </div>
          )}

          <Button
            size="lg"
            className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-semibold h-12 text-sm rounded-xl shadow-xs"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SUBMIT MUTABAAH PEKANAN
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#52635C]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#006B54]" />
            Satu Binaan hanya dapat mengisi satu kali setiap pekan.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#DCE9E1] pt-3 first:border-t-0 first:pt-0">
      <dt className="text-[#52635C]">{label}</dt>
      <dd className="font-semibold text-[#173C32]">{value}</dd>
    </div>
  );
}