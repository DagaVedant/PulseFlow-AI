"use client";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CriticalAlertBanner } from "@/components/layout/CriticalAlertBanner";
import { GuidedTour } from "@/components/tutorial/GuidedTour";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <div className="flex items-center justify-between border-b border-line px-8 py-5">
        <Sidebar />
        <TopBar />
      </div>
      <CriticalAlertBanner />
      <main className="flex-1 overflow-auto px-8 py-8">{children}</main>
      <GuidedTour />
    </div>
  );
}