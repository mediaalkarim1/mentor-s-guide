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

  // Form States (Completely empty on page load)
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
      const serverRes = await loginAdminServer({
        data: { email: adminEmail, password: adminPassword },
      });

      if (!serverRes.ok || !serverRes.email) {
        toast.error(serverRes.error ?? "Username atau password salah.");
        setLoading(false);
        return;
      }

      // Authenticate client Supabase session
      const { error } = await supabase.auth.signInWithPassword({
        email: serverRes.email,
        password: adminPassword,
      });

      if (error) {
        toast.error("Username atau password salah.");
        setLoading(false);
        return;
      }

      toast.success("Login Admin Berhasil!");
      navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      toast.error("Username atau password salah.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMentorLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const serverRes = await loginMentorServer({
        data: { username: mentorUsername, password: mentorPassword },
      });

      if (!serverRes.ok || !serverRes.email) {
        toast.error(serverRes.error ?? "Username atau password salah.");
        setLoading(false);
        return;
      }

      // Authenticate client Supabase session
      const { error } = await supabase.auth.signInWithPassword({
        email: serverRes.email,
        password: mentorPassword,
      });

      if (error) {
        toast.error("Username atau password salah.");
        setLoading(false);
        return;
      }

      toast.success(`Selamat Datang, ${serverRes.mentorName ?? "Mentor"}!`);
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error("Username atau password salah.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">MUTABAAH GURU</h1>
          <p className="text-sm text-muted-foreground">Login ke Sistem Mutabaah</p>
        </div>

        <div className="surface-card p-6 shadow-sm border border-border rounded-xl">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="mentor" className="flex items-center justify-center gap-1.5 py-2.5">
                <UserCheck className="h-4 w-4" />
                <span>Mentor</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center justify-center gap-1.5 py-2.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mentor">
              <form className="space-y-4" onSubmit={handleMentorLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="mentor-username">Username Mentor</Label>
                  <Input
                    id="mentor-username"
                    type="text"
                    required
                    maxLength={100}
                    value={mentorUsername}
                    onChange={(e) => setMentorUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mentor-password">Password Mentor</Label>
                  <Input
                    id="mentor-password"
                    type="password"
                    required
                    minLength={4}
                    maxLength={72}
                    value={mentorPassword}
                    onChange={(e) => setMentorPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full font-semibold py-2.5" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  LOGIN MENTOR
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form className="space-y-4" onSubmit={handleAdminLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">Username / Email Admin</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    required
                    maxLength={255}
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-password">Password Admin</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    minLength={6}
                    maxLength={72}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full font-semibold py-2.5" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  LOGIN ADMIN
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-2">Binaan tidak memerlukan akun login.</p>
            <Link
              to="/mutabaah"
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Isi Mutabaah sebagai Binaan &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
