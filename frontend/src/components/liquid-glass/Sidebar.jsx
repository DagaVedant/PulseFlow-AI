"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/command-center", label: "Command center" },
  { href: "/patient-flow", label: "Patient flow" },
  { href: "/staffing", label: "Staffing" },
  { href: "/clinical", label: "Clinical" },
  { href: "/ai-insights", label: "AI insights" },
  { href: "/labs", label: "Labs" },
  { href: "/operations", label: "Operations" },
  { href: "/copilot", label: "Copilot" },
  { href: "/sandbox", label: "Sandbox" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const FULL = "PulseFlow AI";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(FULL.slice(0, i));
      if (i >= FULL.length) clearInterval(id);
    }, 140);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="sticky top-0 relative h-screen w-[240px] shrink-0 flex flex-col items-start pt-10 pb-8 px-6">
      {/* frosted vibrancy panel */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.46), rgba(255,255,255,0.24))",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          boxShadow:
            "inset -1px 0 0 rgba(255,255,255,0.35), 1px 0 30px -10px rgba(4,18,54,0.25)",
        }}
      />
      {/* subtle right divider */}
      <div className="pointer-events-none absolute top-8 bottom-8 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />

      <div className="relative z-10 mb-10">
        <div className="text-[22px] font-extrabold tracking-tight text-black whitespace-nowrap">
          {typed}
          <span className="ml-[2px] inline-block h-[18px] w-[3px] translate-y-[2px] rounded-sm bg-emerald-600 animate-pulse align-middle" />
        </div>
      </div>

      <nav className="relative z-10 flex flex-col items-start gap-1 w-full">
        {items.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="w-full">
              <div
                className={`cursive w-full rounded-[14px] px-3 py-2 transition-all duration-300 ${
                  isActive
                    ? "text-emerald-600"
                    : "text-black/75 hover:text-black"
                }`}
                style={{
                  fontSize: "24px",
                  lineHeight: 1.2,
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 mt-auto text-[11px] font-semibold tracking-wide text-black/60">
        v1.0
      </div>
    </aside>
  );
}
