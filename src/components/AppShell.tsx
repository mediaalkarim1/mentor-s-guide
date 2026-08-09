import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Home,
  FileEdit,
  Info,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Users,
  BarChart2,
  Calendar,
  User,
  ClipboardList,
  Settings,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/recap.functions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fetchAccount = useServerFn(getMyAccount);

  const { data: accountData } = useQuery({
    queryKey: ["my-account", session?.user?.id],
    queryFn: () => fetchAccount(),
    enabled: Boolean(session),
  });

  const isLoggedIn = Boolean(session);
  const isAdmin = isLoggedIn && (accountData?.isAdmin ?? false);
  const isMentor = isLoggedIn && !isAdmin;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5FAF7] text-[#173C32] overflow-x-hidden flex flex-col justify-between">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#DCE9E1] bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2 font-display text-base font-bold text-[#173C32]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#006B54] text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span>MUTABAAH GURU</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1.5 text-sm font-medium">
              {!isLoggedIn && (
                <>
                  <NavLink to="/">
                    <Home className="inline-block h-4 w-4 mr-1" /> Beranda
                  </NavLink>
                  <NavLink to="/mutabaah">
                    <FileEdit className="inline-block h-4 w-4 mr-1" /> Isi Mutabaah
                  </NavLink>
                  <NavLink to="/panduan">
                    <Info className="inline-block h-4 w-4 mr-1" /> Panduan
                  </NavLink>
                  <NavLink to="/login">
                    <LogIn className="inline-block h-4 w-4 mr-1" /> Login
                  </NavLink>
                </>
              )}

              {isMentor && (
                <>
                  <NavLink to="/dashboard">
                    <Home className="inline-block h-4 w-4 mr-1" /> Dashboard
                  </NavLink>
                  <NavLink to="/dashboard">
                    <Users className="inline-block h-4 w-4 mr-1" /> Binaan
                  </NavLink>
                  <NavLink to="/dashboard">
                    <BarChart2 className="inline-block h-4 w-4 mr-1" /> Rekap
                  </NavLink>
                  <NavLink to="/bulanan">
                    <Calendar className="inline-block h-4 w-4 mr-1" /> Bulanan
                  </NavLink>
                  <NavLink to="/profil">
                    <User className="inline-block h-4 w-4 mr-1" /> Profil
                  </NavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <NavLink to="/admin">
                    <Home className="inline-block h-4 w-4 mr-1" /> Dashboard
                  </NavLink>
                  <NavLink to="/admin">
                    <Users className="inline-block h-4 w-4 mr-1" /> Mentor & Binaan
                  </NavLink>
                  <NavLink to="/admin">
                    <BarChart2 className="inline-block h-4 w-4 mr-1" /> Rekap Mentor
                  </NavLink>
                  <NavLink to="/dashboard">
                    <ClipboardList className="inline-block h-4 w-4 mr-1" /> Mutabaah
                  </NavLink>
                  <NavLink to="/admin">
                    <Settings className="inline-block h-4 w-4 mr-1" /> Pengaturan
                  </NavLink>
                  <NavLink to="/profil">
                    <User className="inline-block h-4 w-4 mr-1" /> Profil
                  </NavLink>
                </>
              )}
            </nav>

            {isLoggedIn && (
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
            )}
          </div>

          {/* Mobile Navigation Toggle (Drawer) */}
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
              {!isLoggedIn && (
                <>
                  <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)}>
                    Beranda
                  </MobileNavLink>
                  <MobileNavLink to="/mutabaah" onClick={() => setMobileMenuOpen(false)}>
                    Isi Mutabaah Pekanan
                  </MobileNavLink>
                  <MobileNavLink to="/panduan" onClick={() => setMobileMenuOpen(false)}>
                    Panduan Pengisian
                  </MobileNavLink>
                  <MobileNavLink to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login Portal
                  </MobileNavLink>
                </>
              )}

              {isMentor && (
                <>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Daftar Binaan
                  </MobileNavLink>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Rekap Pekanan
                  </MobileNavLink>
                  <MobileNavLink to="/bulanan" onClick={() => setMobileMenuOpen(false)}>
                    Rekap Bulanan
                  </MobileNavLink>
                  <MobileNavLink to="/profil" onClick={() => setMobileMenuOpen(false)}>
                    Profil Account
                  </MobileNavLink>
                </>
              )}

              {isAdmin && (
                <>
                  <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard Admin
                  </MobileNavLink>
                  <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    Mentor & Binaan
                  </MobileNavLink>
                  <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    Rekap Mentor
                  </MobileNavLink>
                  <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Mutabaah Data
                  </MobileNavLink>
                  <MobileNavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    Pengaturan
                  </MobileNavLink>
                  <MobileNavLink to="/profil" onClick={() => setMobileMenuOpen(false)}>
                    Profil Account
                  </MobileNavLink>
                </>
              )}
            </nav>

            {isLoggedIn && (
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
            )}
          </div>
        )}
      </header>

      {/* Main Content Area (With bottom padding for Mobile Navigation Bar) */}
      <main className="mx-auto w-full max-w-6xl px-4 py-5 md:py-6 pb-24 md:pb-8 flex-1">
        {children}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#DCE9E1] md:hidden shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {!isLoggedIn && (
            <>
              <BottomNavItem to="/" label="Beranda" icon={<Home className="h-5 w-5" />} />
              <BottomNavItem to="/mutabaah" label="Mutabaah" icon={<FileEdit className="h-5 w-5" />} />
              <BottomNavItem to="/panduan" label="Panduan" icon={<Info className="h-5 w-5" />} />
              <BottomNavItem to="/login" label="Login" icon={<LogIn className="h-5 w-5" />} />
            </>
          )}

          {isMentor && (
            <>
              <BottomNavItem to="/dashboard" label="Dashboard" icon={<Home className="h-5 w-5" />} />
              <BottomNavItem to="/dashboard" label="Binaan" icon={<Users className="h-5 w-5" />} />
              <BottomNavItem to="/dashboard" label="Rekap" icon={<BarChart2 className="h-5 w-5" />} />
              <BottomNavItem to="/bulanan" label="Bulanan" icon={<Calendar className="h-5 w-5" />} />
              <BottomNavItem to="/profil" label="Profil" icon={<User className="h-5 w-5" />} />
            </>
          )}

          {isAdmin && (
            <>
              <BottomNavItem to="/admin" label="Dashboard" icon={<Home className="h-5 w-5" />} />
              <BottomNavItem to="/admin" label="Data" icon={<Users className="h-5 w-5" />} />
              <BottomNavItem to="/admin" label="Rekap" icon={<BarChart2 className="h-5 w-5" />} />
              <BottomNavItem to="/dashboard" label="Mutabaah" icon={<ClipboardList className="h-5 w-5" />} />
              <BottomNavItem to="/admin" label="Setting" icon={<Settings className="h-5 w-5" />} />
              <BottomNavItem to="/profil" label="Profil" icon={<User className="h-5 w-5" />} />
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-1.5 text-xs md:text-sm text-[#52635C] transition-colors hover:bg-[#EAF4EE] hover:text-[#006B54] font-medium"
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

function BottomNavItem({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium text-[#52635C] transition-colors hover:text-[#006B54]"
      activeProps={{ className: "text-[#006B54] font-bold" }}
    >
      <div className="p-1 rounded-full transition-colors active:bg-[#EAF4EE]">
        {icon}
      </div>
      <span className="truncate max-w-[64px] text-center leading-tight">{label}</span>
    </Link>
  );
}