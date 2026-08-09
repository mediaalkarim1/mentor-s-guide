import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Award, ShieldCheck, ArrowRight, Sparkles, BarChart2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/panduan")({
  head: () => ({
    meta: [
      { title: "Panduan & Sistem Penilaian — Mutabaah Guru" },
      {
        name: "description",
        content: "Panduan lengkap pengisian mutabaah pekanan guru, rincian 9 indikator, dan sistem penilaian otomatis.",
      },
      { property: "og:title", content: "Panduan & Sistem Penilaian — Mutabaah Guru" },
    ],
  }),
  component: PanduanPage,
});

function PanduanPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B54] bg-[#EAF4EE] px-3.5 py-1 rounded-full">
            <BookOpen className="h-4 w-4" />
            <span>Panduan Resmi & Sistem Penilaian</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173C32]">Panduan & Sistem Penilaian Mutabaah</h1>
          <p className="text-xs sm:text-sm text-[#52635C] max-w-xl mx-auto">
            Penjelasan cara pengisian, rincian nilai per item dari 9 indikator pekanan, serta rumus perhitungan nilai akhir.
          </p>
        </div>

        {/* Section 1: Apa itu Mutabaah */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#006B54]">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">1. Apa itu Mutabaah Guru?</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#52635C] leading-relaxed">
            <strong>Mutabaah Guru</strong> adalah sarana evaluasi dan monitoring penguatan amaliah harian guru secara berkala berbasis Pekanan. Setiap Binaan mengisikan capaian ibadah sunnah dan amaliah pribadinya yang terhubung langsung ke Mentor pengampu masing-masing.
          </p>
        </section>

        {/* Section 2: Langkah Pengisian */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-[#006B54]">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">2. Tata Cara Pengisian (Untuk Binaan)</h2>
          </div>
          <ol className="space-y-2 text-xs sm:text-sm text-[#52635C] list-decimal list-inside">
            <li>
              Buka menu <strong className="text-[#173C32]">Isi Mutabaah</strong> di halaman utama aplikasi (tanpa perlu login).
            </li>
            <li>
              Cari dan pilih <strong className="text-[#173C32]">Nama Binaan</strong> Anda pada dropdown pencarian.
            </li>
            <li>
              Pilih nama <strong className="text-[#173C32]">Mentor Pengampu</strong> Anda.
            </li>
            <li>
              Pilih capaian pekanan Anda untuk <strong className="text-[#173C32]">9 Indikator Target</strong>.
            </li>
            <li>
              Tekan tombol <strong className="text-[#006B54]">SUBMIT MUTABAAH PEKANAN</strong>. Nilai akhir dan predikat akan dihitung otomatis oleh sistem.
            </li>
          </ol>
        </section>

        {/* Section 3: BAGIAN 2 — SISTEM PENILAIAN MUTABAAH PEKANAN */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE9E1] pb-3">
            <div className="flex items-center gap-2 text-[#006B54]">
              <BarChart2 className="h-5 w-5" />
              <h2 className="text-base sm:text-lg font-bold text-[#173C32]">
                📊 Sistem Penilaian Mutabaah Pekanan
              </h2>
            </div>
            <span className="text-[11px] font-semibold bg-[#EAF4EE] text-[#006B54] px-2.5 py-0.5 rounded-full">
              9 Indikator Master
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#52635C]">
            Berikut adalah rincian persentase nilai yang diperoleh Binaan berdasarkan jumlah realisasi/capaian yang dipilih untuk masing-masing dari 9 Indikator Pekanan:
          </p>

          {/* Grid Cards 9 Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Tahajud */}
            <IndicatorCard
              title="1. Sholat Tahajud"
              target="Target: 3 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali", score: "33.33%" },
                { real: "2 kali", score: "66.67%" },
                { real: "3 kali / lebih", score: "100%" },
              ]}
            />

            {/* 2. Witir */}
            <IndicatorCard
              title="2. Sholat Witir"
              target="Target: 3 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali", score: "33.33%" },
                { real: "2 kali", score: "66.67%" },
                { real: "3 kali / lebih", score: "100%" },
              ]}
            />

            {/* 3. Dhuha */}
            <IndicatorCard
              title="3. Sholat Dhuha"
              target="Target: 5 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali", score: "20%" },
                { real: "2 kali", score: "40%" },
                { real: "3 kali", score: "60%" },
                { real: "4 kali", score: "80%" },
                { real: "5 kali / lebih", score: "100%" },
              ]}
            />

            {/* 4. Rawatib */}
            <IndicatorCard
              title="4. Sholat Sunnah Rawatib"
              target="Target: 21 rakaat / pekan"
              items={[
                { real: "0 – 5 rakaat", score: "23.81%" },
                { real: "6 – 10 rakaat", score: "47.62%" },
                { real: "11 – 15 rakaat", score: "71.43%" },
                { real: "16 – 20 rakaat", score: "95.24%" },
                { real: "21 rakaat / lebih", score: "100%" },
              ]}
            />

            {/* 5. Al-Matsurat */}
            <IndicatorCard
              title="5. Al-Matsurat"
              target="Target: 7 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali", score: "14.29%" },
                { real: "2 kali", score: "28.57%" },
                { real: "3 kali", score: "42.86%" },
                { real: "4 kali", score: "57.14%" },
                { real: "5 kali", score: "71.43%" },
                { real: "6 kali", score: "85.71%" },
                { real: "7 kali / lebih", score: "100%" },
              ]}
            />

            {/* 6. Tilawah */}
            <IndicatorCard
              title="6. Tilawah Quran"
              target="Target: 1 juz / pekan"
              items={[
                { real: "0 juz", score: "0%" },
                { real: "¼ juz", score: "25%" },
                { real: "½ juz", score: "50%" },
                { real: "¾ juz", score: "75%" },
                { real: "1 juz / lebih", score: "100%" },
              ]}
            />

            {/* 7. Olahraga */}
            <IndicatorCard
              title="7. Olahraga"
              target="Target: 1 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali / lebih", score: "100%" },
              ]}
            />

            {/* 8. Membaca Buku */}
            <IndicatorCard
              title="8. Membaca Buku"
              target="Target: 1 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali / lebih", score: "100%" },
              ]}
            />

            {/* 9. Infak */}
            <IndicatorCard
              title="9. Infak Pekanan"
              target="Target: 3 kali / pekan"
              items={[
                { real: "0 kali", score: "0%" },
                { real: "1 kali", score: "33.33%" },
                { real: "2 kali", score: "66.67%" },
                { real: "3 kali / lebih", score: "100%" },
              ]}
            />
          </div>

          {/* Formula Box */}
          <div className="bg-[#EAF4EE] p-4 rounded-xl border border-[#CFE4D8] space-y-2 mt-4">
            <div className="flex items-center gap-2 text-[#006B54] font-bold text-xs sm:text-sm">
              <Calculator className="h-4 w-4" />
              <span>Nilai Pekanan Akhir</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-[#DCE9E1] font-mono text-center font-bold text-[#173C32] text-xs sm:text-sm">
              Nilai Pekanan Akhir = Jumlah Nilai 9 Indikator ÷ 9
            </div>
            <p className="text-xs text-[#52635C] text-center pt-1 italic">
              Nilai akhir pekanan dihitung otomatis dari rata-rata 9 indikator Mutabaah. Binaan tidak perlu menghitung sendiri.
            </p>
          </div>
        </section>

        {/* Section 4: Standar Predikat Penilaian */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-[#006B54]">
            <Award className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">4. Kriteria Predikat Penilaian</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-3 rounded-xl bg-[#E5F6EC] border border-[#B7E8CB] text-[#087443]">
              <p className="font-bold text-sm">90 – 100</p>
              <p className="font-semibold mt-0.5">Sangat Baik</p>
            </div>
            <div className="p-3 rounded-xl bg-[#EAF6EE] border border-[#C3E8D2] text-[#21804D]">
              <p className="font-bold text-sm">80 – 89.99</p>
              <p className="font-semibold mt-0.5">Baik</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF5D9] border border-[#FBE5A3] text-[#9A6A00]">
              <p className="font-bold text-sm">70 – 79.99</p>
              <p className="font-semibold mt-0.5">Cukup</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FFF0E8] border border-[#FDD0B8] text-[#B45309]">
              <p className="font-bold text-sm">&lt; 70</p>
              <p className="font-semibold mt-0.5">Perlu Evaluasi</p>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="text-center pt-2">
          <Button asChild className="bg-[#006B54] hover:bg-[#005844] text-white font-bold h-12 px-8 rounded-xl text-sm shadow-xs">
            <Link to="/mutabaah">
              Isi Mutabaah Sekarang <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function IndicatorCard({
  title,
  target,
  items,
}: {
  title: string;
  target: string;
  items: { real: string; score: string }[];
}) {
  return (
    <div className="surface-card border border-[#DCE9E1] rounded-xl bg-[#F5FAF7]/60 overflow-hidden text-xs flex flex-col justify-between">
      <div className="bg-[#EAF4EE] px-3.5 py-2 border-b border-[#DCE9E1]">
        <h3 className="font-bold text-[#173C32]">{title}</h3>
        <p className="text-[11px] text-[#006B54] font-medium">{target}</p>
      </div>
      <div className="p-3 space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex justify-between items-center py-0.5 border-b border-[#EAF4EE] last:border-none">
            <span className="text-[#52635C]">{it.real}</span>
            <span className="font-bold text-[#006B54] tabular-nums bg-white px-2 py-0.5 rounded border border-[#DCE9E1]">
              {it.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
