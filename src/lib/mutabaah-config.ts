export type CapaianOption = { label: string; value: number };

export type IndicatorOptionMap = Record<string, CapaianOption[]>;

const xOptions = (max: number): CapaianOption[] =>
  Array.from({ length: max + 1 }, (_, i) => ({
    label: i === max ? `${i}x atau lebih` : `${i}x`,
    value: i,
  }));

export const INDICATOR_OPTIONS: IndicatorOptionMap = {
  tahajud: xOptions(3),
  witir: xOptions(3),
  dhuha: xOptions(5),
  rawatib: [
    { label: "0–5 rakaat", value: 5 },
    { label: "6–10 rakaat", value: 10 },
    { label: "11–15 rakaat", value: 15 },
    { label: "16–20 rakaat", value: 20 },
    { label: "21 rakaat atau lebih", value: 21 },
  ],
  almatsurat: xOptions(7),
  tilawah: [
    { label: "0 juz", value: 0 },
    { label: "¼ juz", value: 0.25 },
    { label: "½ juz", value: 0.5 },
    { label: "¾ juz", value: 0.75 },
    { label: "1 juz atau lebih", value: 1 },
  ],
  olahraga: xOptions(1),
  bacabuku: xOptions(1),
  infak: xOptions(3),
};

export function optionsFor(code: string, target: number, unit: string): CapaianOption[] {
  const preset = INDICATOR_OPTIONS[code];
  if (preset) return preset;
  const max = Math.max(1, Math.round(target));
  return Array.from({ length: max + 1 }, (_, i) => ({
    label: i === max ? `${i} ${unit} atau lebih` : `${i} ${unit}`,
    value: i,
  }));
}

export function scoreFor(realization: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.round(Math.min(realization / target, 1) * 100);
}

export function averageScore(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function categoryFor(score: number): string {
  if (score >= 90) return "Sangat Baik";
  if (score >= 80) return "Baik";
  if (score >= 70) return "Cukup";
  if (score >= 60) return "Perlu Peningkatan";
  return "Perlu Perhatian";
}

export function categoryTone(score: number): "excellent" | "good" | "fair" | "low" | "critical" {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "fair";
  if (score >= 60) return "low";
  return "critical";
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function formatPeriod(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
}

export function monthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}