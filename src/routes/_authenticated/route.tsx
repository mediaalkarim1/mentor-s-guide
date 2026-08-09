import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw redirect({ to: "/login" });
      }
      return { user: data.user };
    } catch (e: any) {
      if (e?.to || e?.isRedirect) throw e;
      throw redirect({ to: "/login" });
    }
  },
  errorComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background">
      <div className="surface-card p-8 text-center space-y-4 max-w-md w-full border border-border rounded-xl">
        <h2 className="text-xl font-bold">Sesi Login Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground">
          Silakan masuk terlebih dahulu untuk mengakses halaman ini.
        </p>
        <div className="pt-2">
          <Link to="/login">
            <Button className="w-full">Ke Halaman Login</Button>
          </Link>
        </div>
      </div>
    </div>
  ),
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});