import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";

import { getBinaanDetail } from "@/lib/recap.functions";
import { formatPeriod } from "@/lib/mutabaah-config";
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
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat detail...
      </div>
    );
  }

  if (!data?.binaan) {
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Data binaan tidak ditemukan atau bukan binaan Anda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke rekap
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{data.binaan.name}</h1>
        {data.period && (
          <p className="text-sm text-muted-foreground">
            Periode {formatPeriod(data.period.start_date, data.period.end_date)}
          </p>
        )}
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mutabaah</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Capaian</th>
              <th className="px-4 py-3 text-right">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.entries.map((e) => (
              <tr key={e.name}>
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.target} {e.unit}
                </td>
                <td className="px-4 py-3">
                  {e.realization} {e.unit}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{e.score}</td>
              </tr>
            ))}
            {data.entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada pengisian mutabaah.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="surface-card overflow-hidden">
        <h2 className="border-b border-border px-4 py-3 text-base font-semibold">Riwayat Nilai</h2>
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3 text-center">Nilai</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.history.map((h) => (
              <tr key={h.periodId}>
                <td className="px-4 py-3">{formatPeriod(h.start_date, h.end_date)}</td>
                <td className="px-4 py-3 text-center font-semibold tabular-nums">{h.score}</td>
                <td className="px-4 py-3">
                  <ScoreBadge score={h.score} />
                </td>
              </tr>
            ))}
            {data.history.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada riwayat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}