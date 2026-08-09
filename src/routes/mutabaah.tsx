import { createFileRoute } from "@tanstack/react-router";
import { MutabaahForm } from "@/components/MutabaahForm";

export const Route = createFileRoute("/mutabaah")({
  head: () => ({
    meta: [
      { title: "Isi Mutabaah Pekanan — Mutabaah Guru" },
      {
        name: "description",
        content:
          "Form pengisian mutabaah pekanan untuk Binaan. Pilih nama dan Mentor, isi capaian, nilai dihitung otomatis.",
      },
      { property: "og:title", content: "Isi Mutabaah Pekanan — Mutabaah Guru" },
      {
        property: "og:description",
        content: "Form pengisian mutabaah pekanan untuk Binaan tanpa perlu login.",
      },
    ],
  }),
  component: MutabaahForm,
});