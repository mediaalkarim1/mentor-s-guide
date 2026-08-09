import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Award, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/panduan")({
  head: () => ({
    meta: [
      { title: "Panduan Pengisian — Mutabaah Guru" },
      {
        name: "description",
        content: "Panduan lengkap pengisian mutabaah pekanan guru, target indikator, dan kriteria penilaian.",
      },
      { property: "og:title", content: "Panduan Pengisian — Mutabaah Guru" },
    ],
  }),
  component: PanduanPage,
});

function PanduanPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-20 md:pb-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B54] bg-[#EAF4EE] px-3.5 py-1 rounded-full">
            <BookOpen className="h-4 w-4" />
            <span>Panduan Resmi Sistem Mutabaah</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#173C32]">Panduan Pengisian Mutabaah Pekanan</h1>
          <p className="text-xs sm:text-sm text-[#52635C]">
            Panduan lengkap mengenai tata cara pengisian, target 9 indikator amaliah, dan standar evaluasi predikat.
          </p>
        </div>

        {/* Section 1: Apa itu Mutabaah */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-3">
          <div className="flex items-center gap-2 text-[#006B54]">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">1. Apa itu Mutabaah Guru?</h2>
          </div>
          <p className="text-xs sm:text-sm text-[#52635C] leading-relaxed">
            <strong>Mutabaah Guru</strong> adalah sarana evaluasi dan monitoring penguatan amaliah harian guru secara berkala berbasis Pekanan. Setiap Binaan mengisikan capaian ibadah sunnah dan amaliah pribadinya yang terhubung langsung ke Mentor pengampu masing-masing.
          </p>
        </section>

        {/* Section 2: Langkah Pengisian */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4">
          <div className="flex items-center gap-2 text-[#006B54]">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">2. Tata Cara Pengisian (Untuk Binaan)</h2>
          </div>
          <ol className="space-y-2.5 text-xs sm:text-sm text-[#52635C] list-decimal list-inside">
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

        {/* Section 3: 9 Target Indikator */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4">
          <div className="flex items-center gap-2 text-[#006B54]">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-base sm:text-lg font-bold text-[#173C32]">3. Standar Target 9 Indikator Pekanan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <IndicatorItem name="1. Sholat Tahajud" target="3 kali / pekan" />
            <IndicatorItem name="2. Sholat Witir" target="3 kali / pekan" />
            <IndicatorItem name="3. Sholat Dhuha" target="5 kali / pekan" />
            <IndicatorItem name="4. Sholat Rawatib" target="21 rakaat / pekan" />
            <IndicatorItem name="5. Al-Matsurat" target="7 kali / pekan" />
            <IndicatorItem name="6. Tilawah Quran" target="1 juz / pekan" />
            <IndicatorItem name="7. Olahraga" target="1 kali / pekan" />
            <IndicatorItem name="8. Membaca Buku" target="1 kali / pekan" />
            <IndicatorItem name="9. Infak Pekanan" target="3 kali / pekan" />
          </div>
        </section>

        {/* Section 4: Standar Predikat Penilaian */}
        <section className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4">
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

function IndicatorItem({ name, target }: { name: string; target: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5FAF7] border border-[#DCE9E1]">
      <span className="font-semibold text-[#173C32]">{name}</span>
      <span className="font-medium text-[#006B54] bg-white px-2 py-0.5 rounded-md border border-[#DCE9E1] text-[11px]">{target}</span>
    </div>
  );
}
