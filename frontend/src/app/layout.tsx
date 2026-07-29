import type { Metadata } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/components/layout/WebSocketProvider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "PulseFlow AI: Hospital Operating System",
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
      <body
        className="bg-clinical-canvas text-clinical-text-strong font-sans antialiased"
        suppressHydrationWarning
      >
        <WebSocketProvider>
          <AppShell>{children}</AppShell>
        </WebSocketProvider>
      </body>
    </html>
  );
}
