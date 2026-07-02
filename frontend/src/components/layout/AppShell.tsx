"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";
import { CriticalAlertBanner } from "@/components/layout/CriticalAlertBanner";
import { AuthGuard } from "@/components/layout/AuthGuard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <WebSocketProvider>
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
      </WebSocketProvider>
    </AuthGuard>
  );
}
