import { createFileRoute } from "@tanstack/react-router";
import { MutabaahForm } from "@/components/MutabaahForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mutabaah Guru — Pengisian Mutabaah Pekanan" },
      {
        name: "description",
        content:
          "Isi mutabaah pekanan Anda: tahajud, witir, dhuha, rawatib, al-matsurat, tilawah, dan lainnya. Nilai dihitung otomatis.",
      },
      { property: "og:title", content: "Mutabaah Guru — Pengisian Mutabaah Pekanan" },
      {
        property: "og:description",
        content: "Pengisian mutabaah pekanan guru. Nilai otomatis masuk ke rekap Mentor.",
      },
    ],
  }),
  component: MutabaahForm,
});
