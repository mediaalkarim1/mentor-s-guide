import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { getBinaanDetail } from "@/lib/recap.functions";
import { formatDisplayScore, formatPeriod } from "@/lib/mutabaah-config";
import { ScoreBadge } from "@/components/ScoreBadge";

export const Route = createFileRoute("/_authenticated/binaan/$binaanId")({
  head: () => ({
    meta: [
      { title: "Detail Mutabaah Binaan — Mutabaah Guru" },
      { name: "description", content: "Rincian capaian dan riwayat nilai mutabaah seorang binaan." },
      { property: "og:title", content: "Detail Mutabaah Binaan — Mutabaah Guru" },
      { property: "og:description", content: "Rincian capaian dan riwayat nilai mutabaah binaan." },
    ],
  }),
  component: BinaanDetailPage,
});

function BinaanDetailPage() {
  const { binaanId } = Route.useParams();
  const fetchDetail = useServerFn(getBinaanDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["binaan-detail", binaanId],
    queryFn: () => fetchDetail({ data: { binaanId } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#006B54]" /> Memuat detail binaan...
      </div>
    );
  }

  if (!data?.binaan) {
    return (
      <div className="surface-card p-6 text-sm text-[#52635C] border border-[#DCE9E1] bg-white rounded-xl">
        Data binaan tidak ditemukan atau bukan binaan Anda.
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#006B54] hover:underline"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Rekap Pekanan
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">{data.binaan.name}</h1>
        {data.period && (
          <p className="text-xs sm:text-sm text-[#52635C] mt-0.5">
            Periode Aktif {formatPeriod(data.period.start_date, data.period.end_date)}
          </p>
        )}
      </div>

      {/* Rincian Mutabaah Pekan Ini */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
        <div className="border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3 sm:px-5">
          <h2 className="text-sm sm:text-base font-bold text-[#173C32]">Capaian Mutabaah Pekan Ini</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead className="bg-[#EAF4EE]/50 text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-4 py-3">Indikator Mutabaah</th>
                <th className="px-4 py-3">Target Pekanan</th>
                <th className="px-4 py-3">Capaian Binaan</th>
                <th className="px-4 py-3 text-right">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {data.entries.map((e) => (
                <tr key={e.name} className="hover:bg-[#F5FAF7]">
                  <td className="px-4 py-3 font-semibold text-[#173C32]">{e.name}</td>
                  <td className="px-4 py-3 text-xs text-[#52635C]">
                    {e.target} {e.unit}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-[#173C32]">
                    {e.realization} {e.unit}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[#006B54]">
                    {formatDisplayScore(e.score)}
                  </td>
                </tr>
              ))}
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-[#52635C]">
                    Belum ada pengisian mutabaah untuk pekan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Nilai Pekanan */}
      <div className="surface-card overflow-hidden border border-[#DCE9E1] rounded-2xl bg-white">
        <div className="border-b border-[#DCE9E1] bg-[#EAF4EE] px-4 py-3 sm:px-5">
          <h2 className="text-sm sm:text-base font-bold text-[#173C32]">Riwayat Nilai Pekanan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-sm">
            <thead className="bg-[#EAF4EE]/50 text-left text-xs uppercase tracking-wide text-[#245347]">
              <tr>
                <th className="px-4 py-3">Rentang Periode Pekan</th>
                <th className="px-4 py-3 text-center">Nilai Akhir</th>
                <th className="px-4 py-3">Predikat Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E1]">
              {data.history.map((h) => (
                <tr key={h.periodId} className="hover:bg-[#F5FAF7]">
                  <td className="px-4 py-3 text-xs font-medium text-[#173C32]">
                    {formatPeriod(h.start_date, h.end_date)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold tabular-nums text-[#006B54]">
                    {formatDisplayScore(h.score)}
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={h.score} />
                  </td>
                </tr>
              ))}
              {data.history.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-[#52635C]">
                    Belum ada riwayat mutabaah terdahulu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}