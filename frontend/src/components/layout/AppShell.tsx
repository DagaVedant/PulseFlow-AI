"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CriticalAlertBanner } from "@/components/layout/CriticalAlertBanner";

const STANDALONE_ROUTES = [
  "/command-center",
  "/patient-flow",
  "/staffing",
  "/clinical",
  "/ai-insights",
  "/labs",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (STANDALONE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <CriticalAlertBanner />
        <main className="flex-1 overflow-auto bg-clinical-canvas">
          {children}
        </main>
      </div>
    </div>
  );
}
