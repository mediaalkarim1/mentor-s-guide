import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { loginAdminFn, loginMentorFn } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login Sistem — Mutabaah Guru" },
      { name: "description", content: "Halaman masuk untuk Admin dan Mentor Mutabaah Guru." },
      { property: "og:title", content: "Login Sistem — Mutabaah Guru" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const loginAdminServer = useServerFn(loginAdminFn);
  const loginMentorServer = useServerFn(loginMentorFn);

  const [activeTab, setActiveTab] = useState<"mentor" | "admin">("mentor");

  // Form States
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [mentorUsername, setMentorUsername] = useState("");
  const [mentorPassword, setMentorPassword] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const rawInput = adminEmail.trim().toLowerCase();
      const loginEmail = rawInput.includes("@") ? rawInput : `${rawInput}@mutabaah.sch.id`;

      // 1. Try direct client-side Supabase authentication first
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: adminPassword,
      });

      if (!error && data.session) {
        toast.success("Login Admin Berhasil!");
        navigate({ to: "/admin", replace: true });
        return;
      }

      // 2. Fallback to server function if user auto-provisioning is needed
      const serverRes = await loginAdminServer({
        data: { email: adminEmail, password: adminPassword },
      }).catch(() => null);

      if (serverRes?.ok && serverRes?.email) {
        const { error: retryErr } = await supabase.auth.signInWithPassword({
          email: serverRes.email,
          password: adminPassword,
        });

        if (!retryErr) {
          toast.success("Login Admin Berhasil!");
          navigate({ to: "/admin", replace: true });
          return;
        }
      }

      toast.error("Username atau password Admin salah.");
    } catch (err: any) {
      toast.error("Username atau password Admin salah.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMentorLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const rawInput = mentorUsername.trim().toLowerCase();
      const formattedEmail = rawInput.includes("@") ? rawInput : `${rawInput}@mutabaah.sch.id`;

      // 1. Try direct client-side Supabase authentication first
      const { data: directData, error: directErr } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: mentorPassword || "mentor123",
      });

      if (!directErr && directData.session) {
        toast.success(`Selamat Datang, ${mentorUsername}!`);
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      // 2. Fallback via server function
      const serverRes = await loginMentorServer({
        data: { username: mentorUsername, password: mentorPassword },
      }).catch(() => null);

      if (serverRes?.ok && serverRes?.email) {
        const { error: retryErr } = await supabase.auth.signInWithPassword({
          email: serverRes.email,
          password: mentorPassword,
        });

        if (!retryErr) {
          toast.success(`Selamat Datang, ${serverRes.mentorName ?? mentorUsername}!`);
          navigate({ to: "/dashboard", replace: true });
          return;
        }
      }

      toast.error("Username atau password Mentor salah.");
    } catch (err: any) {
      toast.error("Username atau password Mentor salah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5FAF7] px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-13 w-13 rounded-2xl bg-[#006B54] text-white shadow-xs mb-1">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#173C32]">MUTABAAH GURU</h1>
          <p className="text-xs sm:text-sm text-[#52635C]">Portal Autentikasi Mentor & Admin</p>
        </div>

        <div className="surface-card p-5 sm:p-7 shadow-xs border border-[#DCE9E1] rounded-2xl bg-white">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#EAF4EE] p-1 rounded-xl">
              <TabsTrigger
                value="mentor"
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white text-[#52635C]"
              >
                <UserCheck className="h-4 w-4" />
                <span>Mentor</span>
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-[#006B54] data-[state=active]:text-white text-[#52635C]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentor">
              <form className="space-y-4" onSubmit={handleMentorLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="mentor-username" className="text-xs font-semibold text-[#173C32]">Username Mentor</Label>
                  <Input
                    id="mentor-username"
                    type="text"
                    required
                    maxLength={100}
                    value={mentorUsername}
                    onChange={(e) => setMentorUsername(e.target.value)}
                    placeholder="Masukkan username mentor"
                    className="min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mentor-password" className="text-xs font-semibold text-[#173C32]">Password Mentor</Label>
                  <Input
                    id="mentor-password"
                    type="password"
                    required
                    minLength={4}
                    maxLength={72}
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-bold h-11 text-sm rounded-xl shadow-xs"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  LOGIN MENTOR
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form className="space-y-4" onSubmit={handleAdminLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email" className="text-xs font-semibold text-[#173C32]">Username / Email Admin</Label>
                  <Input
                    id="admin-email"
                    type="text"
                    required
                    maxLength={255}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Masukkan username atau email admin"
                    className="min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password" className="text-xs font-semibold text-[#173C32]">Password Admin</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    minLength={4}
                    maxLength={72}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    className="min-h-[44px] bg-white border-[#D5E3DB] focus:border-[#0F8A6A]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#006B54] hover:bg-[#005844] text-white font-bold h-11 text-sm rounded-xl shadow-xs"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  LOGIN ADMIN
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-[#DCE9E1] text-center">
            <p className="text-xs text-[#52635C] mb-2">Binaan tidak memerlukan akun login.</p>
            <Link
              to="/mutabaah"
              className="inline-flex items-center text-xs font-semibold text-[#006B54] hover:underline"
            >
              Isi Mutabaah sebagai Binaan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
