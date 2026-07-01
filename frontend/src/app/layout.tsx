import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";
import { CriticalAlertBanner } from "@/components/layout/CriticalAlertBanner";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pf-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-clinical-canvas text-clinical-text-strong font-sans antialiased">
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
      </body>
    </html>
  );
}
