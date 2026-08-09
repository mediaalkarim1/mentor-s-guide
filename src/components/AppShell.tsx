import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Menu, X, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/recap.functions";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fetchAccount = useServerFn(getMyAccount);

  const { data: accountData } = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
  });

  const isAdmin = accountData?.isAdmin ?? false;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5FAF7] text-[#173C32] overflow-x-hidden">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#DCE9E1] bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-base font-bold text-[#173C32]">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#006B54] text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>MUTABAAH GURU</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1.5 text-sm font-medium">
              <NavLink to="/dashboard">Rekap Pekanan</NavLink>
              <NavLink to="/bulanan">Rekap Bulanan</NavLink>
              {isAdmin && <NavLink to="/admin">Panel Admin</NavLink>}
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="ml-2 text-[#52635C] hover:bg-[#EAF4EE] hover:text-[#006B54] h-9 text-xs font-semibold"
              aria-label="Keluar"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              <span>Keluar</span>
            </Button>
          </div>

          {/* Mobile Navigation Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE9E1] bg-white text-[#173C32] hover:bg-[#EAF4EE]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-[#DCE9E1] bg-white px-4 py-3 md:hidden space-y-2 animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col space-y-1.5 text-sm font-medium">
              <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                Rekap Pekanan
              </MobileNavLink>
              <MobileNavLink to="/bulanan" onClick={() => setMobileMenuOpen(false)}>
                Rekap Bulanan
              </MobileNavLink>
              {isAdmin && (
                <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  Panel Admin
                </MobileNavLink>
              )}
            </nav>
            <div className="pt-2 border-t border-[#DCE9E1]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="w-full justify-center text-destructive border-destructive/20 hover:bg-destructive/10 h-10 font-semibold"
              >
                <LogOut className="mr-2 h-4 w-4" /> Keluar dari Akun
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-5 md:py-6">{children}</main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-1.5 text-xs md:text-sm text-[#52635C] transition-colors hover:bg-[#EAF4EE] hover:text-[#006B54]"
      activeProps={{ className: "bg-[#EAF4EE] text-[#006B54] font-semibold" }}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-lg px-3 py-2.5 text-sm text-[#52635C] transition-colors hover:bg-[#EAF4EE] hover:text-[#006B54]"
      activeProps={{ className: "bg-[#EAF4EE] text-[#006B54] font-semibold" }}
    >
      {children}
    </Link>
  );
}