import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { User, LogOut, ShieldCheck, Mail, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/recap.functions";
import { getAdminData } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil Saya — Mutabaah Guru" },
      { name: "description", content: "Informasi akun pengguna dan sesi login Mutabaah Guru." },
      { property: "og:title", content: "Profil Saya — Mutabaah Guru" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchAdmin = useServerFn(getAdminData);

  const { data: account, isLoading } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  const isAdmin = account?.isAdmin ?? false;
  const { data: master } = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => fetchAdmin(),
    enabled: isAdmin,
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Berhasil keluar dari akun.");
    navigate({ to: "/login", replace: true });
  }

  if (isLoading || !account) {
    return (
      <div className="flex items-center justify-center py-20 text-[#52635C]">
        <p className="text-sm font-medium">Memuat profil akun...</p>
      </div>
    );
  }

  const binaanCount = account.mentor && master
    ? master.binaan.filter((b: any) => b.mentor_id === account.mentor?.id).length
    : undefined;

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-20 md:pb-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#006B54] text-white shadow-xs mb-1">
          <User className="h-8 w-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#173C32]">
          {account.mentor?.name ?? (isAdmin ? "Administrator" : "Pengguna System")}
        </h1>
        <p className="text-xs sm:text-sm text-[#52635C]">
          {isAdmin ? "Hak Akses: ADMIN MASTER" : "Hak Akses: MENTOR PENGAMPU"}
        </p>
      </div>

      <div className="surface-card p-5 sm:p-6 border border-[#DCE9E1] rounded-2xl bg-white space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-[#173C32] border-b border-[#DCE9E1] pb-2 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#006B54]" />
          <span>Informasi Akun & Sesi Login</span>
        </h2>

        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-[#52635C] flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-[#006B54]" /> Email / User ID
            </span>
            <span className="font-semibold text-[#173C32]">{account.email || account.userId.slice(0, 8) + "..."}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-[#DCE9E1]">
            <span className="text-[#52635C] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#006B54]" /> Peran (Role)
            </span>
            <span className="font-bold text-[#006B54] bg-[#EAF4EE] px-2.5 py-0.5 rounded-full text-xs">
              {isAdmin ? "Admin Master" : "Mentor"}
            </span>
          </div>

          {account.mentor && (
            <div className="flex justify-between items-center py-1 border-t border-[#DCE9E1]">
              <span className="text-[#52635C] flex items-center gap-1.5">
                <User className="h-4 w-4 text-[#006B54]" /> Data Mentor Terhubung
              </span>
              <span className="font-semibold text-[#173C32]">{account.mentor.name}</span>
            </div>
          )}

          {binaanCount !== undefined && (
            <div className="flex justify-between items-center py-1 border-t border-[#DCE9E1]">
              <span className="text-[#52635C] flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#006B54]" /> Total Binaan Bimbingan
              </span>
              <span className="font-bold text-[#173C32]">{binaanCount} Orang</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1 border-t border-[#DCE9E1]">
            <span className="text-[#52635C] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#087443]" /> Status Sesi
            </span>
            <span className="font-semibold text-[#087443]">Aktif (Terotentikasi)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-[#DCE9E1]">
          <Button
            variant="destructive"
            className="w-full bg-[#D92D20] hover:bg-[#B42318] text-white font-bold h-11 text-sm rounded-xl shadow-xs"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" /> KELUAR DARI AKUN
          </Button>
        </div>
      </div>
    </div>
  );
}
