/* Root Next.js layout: global styles, fonts, and the application chrome around every page. */
import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";

export const metadata: Metadata = {
  title: "PulseFlow AI — Hospital Operating System",
  description: "AI-Powered Hospital Digital Twin Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-space-900 text-slate-100 font-sans antialiased">
        <WebSocketProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-auto grid-bg">
                {children}
              </main>
            </div>
          </div>
        </WebSocketProvider>
      </body>
    </html>
  );
}
