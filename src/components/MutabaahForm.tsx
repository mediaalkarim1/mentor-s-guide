import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, Loader2, ShieldCheck } from "lucide-react";

import { getPublicFormData, submitMutabaah } from "@/lib/mutabaah.functions";
import { formatDisplayScore, formatPeriod, optionsFor } from "@/lib/mutabaah-config";
import { MASTER_BINAAN, MASTER_INDICATORS, MASTER_MENTORS, MASTER_PERIOD } from "@/lib/master-data";
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
    queryFn: async () => {
      try {
        const res = await loadData();
        if (res && res.mentors && res.mentors.length > 0) {
          return res;
        }
      } catch (e) {
        console.warn("loadData failed, using master fallbacks", e);
      }
      return {
        period: MASTER_PERIOD,
        mentors: MASTER_MENTORS,
        binaan: MASTER_BINAAN,
        indicators: MASTER_INDICATORS,
      };
    },
  });

  const [binaanId, setBinaanId] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [openBinaan, setOpenBinaan] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const binaanList = (data?.binaan && data.binaan.length > 0) ? data.binaan : MASTER_BINAAN;
  const mentors = (data?.mentors && data.mentors.length > 0) ? data.mentors : MASTER_MENTORS;
  const indicators = (data?.indicators && data.indicators.length > 0) ? data.indicators : MASTER_INDICATORS;
  const selectedBinaan = binaanList.find((b) => b.id === binaanId);

  const activePeriod = data?.period ?? MASTER_PERIOD;
  const periodLabel = activePeriod
    ? formatPeriod(activePeriod.start_date, activePeriod.end_date)
    : formatPeriod(MASTER_PERIOD.start_date, MASTER_PERIOD.end_date);

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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4EE] text-[#006B54]">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#173C32] mb-1">MUTABAAH TERKIRIM!</h2>
          <p className="text-xs sm:text-sm text-[#52635C] mb-6">
            Terima kasih telah mengisi mutabaah pekanan.
          </p>

          <div className="surface-soft p-5 rounded-xl text-left space-y-3 mb-6 border border-[#D5E3DB]">
            <div className="flex justify-between border-b border-[#D5E3DB] pb-2 text-xs">
              <span className="text-[#52635C]">Periode</span>
              <span className="font-semibold text-[#173C32]">{success.period}</span>
            </div>
            <div className="flex justify-between border-b border-[#D5E3DB] pb-2 text-xs">
              <span className="text-[#52635C]">Nama Binaan</span>
              <span className="font-semibold text-[#173C32]">{success.binaanName}</span>
            </div>
            <div className="flex justify-between border-b border-[#D5E3DB] pb-2 text-xs">
              <span className="text-[#52635C]">Mentor</span>
              <span className="font-semibold text-[#173C32]">{success.mentorName}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-xs">
              <span className="text-[#52635C] font-semibold">Skor Pekanan</span>
              <ScoreBadge score={success.score} className="text-sm px-3 py-1" />
            </div>
          </div>

          <Button
            onClick={() => {
              setSuccess(null);
              setBinaanId("");
              setMentorId("");
              setValues({});
            }}
            className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-bold h-11 text-sm rounded-xl shadow-xs"
          >
            ISI MUTABAAH LAGI
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 sm:px-4 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header Banner - White text title */}
      <header className="bg-gradient-to-b from-[#006B54] to-[#0F8A6A] -mx-3 sm:-mx-4 mb-6 px-4 py-7 sm:px-8 sm:py-9 text-center text-white sm:rounded-b-3xl shadow-sm">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
          MUTABAAH GURU SEKOLAH ALAM AL-KARIM
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#E6F4EE] max-w-md mx-auto mb-4 opacity-95">
          Form Evaluasi & Monitoring Capaian Pekanan Guru
        </p>

        {periodLabel && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20 text-white">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span>Periode: {periodLabel}</span>
          </div>
        )}
      </header>

      <div className="surface-card p-4 sm:p-7 shadow-xs border border-[#DCE9E1] rounded-2xl bg-white space-y-6">
        {/* Step 1: Identitas */}
        <div className="space-y-4 pb-5 border-b border-[#DCE9E1]">
          <h2 className="text-sm sm:text-base font-bold text-[#173C32] flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#006B54] text-white text-xs font-bold">1</span>
            IDENTITAS GURU (BINAAN) & MENTOR
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Searchable Binaan Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#173C32]">Nama Binaan (Guru)</Label>
              <Popover open={openBinaan} onOpenChange={setOpenBinaan}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBinaan}
                    className="w-full justify-between min-h-[44px] bg-white border-[#D5E3DB] hover:bg-[#F5FAF7] text-left font-normal text-xs sm:text-sm"
                  >
                    <span className="truncate">
                      {selectedBinaan ? selectedBinaan.name : "Cari / pilih nama Binaan..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 shadow-lg border-[#DCE9E1]" align="start">
                  <Command>
                    <CommandInput placeholder="Ketik nama Binaan..." className="text-xs h-10" />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                        Binaan tidak ditemukan.
                      </CommandEmpty>
                      <CommandGroup>
                        {binaanList.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={b.name}
                            onSelect={() => {
                              setBinaanId(b.id);
                              setMentorId(b.mentor_id);
                              setOpenBinaan(false);
                            }}
                            className="text-xs py-2 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-[#006B54]",
                                binaanId === b.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="font-medium text-[#173C32]">{b.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Mentor Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#173C32]">Mentor Terkait</Label>
              <Select
                value={mentorId}
                onValueChange={(val) => setMentorId(val)}
              >
                <SelectTrigger className="w-full min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A] text-xs sm:text-sm">
                  <SelectValue placeholder="Pilih Mentor..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-[#DCE9E1]">
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs sm:text-sm py-2">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mismatch && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⚠️ <strong>Perhatian:</strong> Mentor yang dipilih tidak sesuai dengan data terdaftar Binaan ini.
            </p>
          )}
        </div>

        {/* Step 2: 9 Indikator Pekanan */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#173C32] flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#006B54] text-white text-xs font-bold">2</span>
              CAPAIAN 9 INDIKATOR PEKANAN
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[#52635C] space-y-2">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#006B54]" />
              <p className="text-xs">Memuat form mutabaah...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {indicators.map((item, idx) => {
                const val = values[item.id] ?? "";
                const opts = optionsFor(item.target);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#EAF2ED] bg-[#F9FCFA] space-y-2 hover:border-[#D5E3DB] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#006B54] text-white tracking-wider">
                            #{idx + 1}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-[#173C32]">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-[#52635C] pl-0.5">
                          Target pekanan: <strong className="text-[#173C32]">{item.target} {item.unit}</strong>
                        </p>
                      </div>
                    </div>

                    <Select
                      value={val}
                      onValueChange={(newVal) =>
                        setValues((prev) => ({ ...prev, [item.id]: newVal }))
                      }
                    >
                      <SelectTrigger className="w-full bg-white border-[#D5E3DB] focus:border-[#0F8A6A] min-h-[40px] text-xs sm:text-sm">
                        <SelectValue placeholder={`Pilih capaian ${item.name}...`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 border-[#DCE9E1]">
                        {opts.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)} className="text-xs sm:text-sm py-2">
                            {opt.label} ({formatDisplayScore(opt.score)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={mutation.isPending || isLoading}
          className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-bold h-12 text-sm sm:text-base rounded-xl shadow-xs"
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          SUBMIT MUTABAAH PEKANAN
        </Button>
      </div>
    </div>
  );
}