"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Share2,
  Users,
  Stethoscope,
  Brain,
  FlaskConical,
  ClipboardList,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/command-center", icon: LayoutGrid, label: "Command center" },
  { href: "/digital-twin", icon: Share2, label: "Digital twin" },
  { href: "/patient-intel", icon: Users, label: "Patient intel" },
  { href: "/operations", icon: Stethoscope, label: "Operations hub" },
  { href: "/copilot", icon: Brain, label: "AI copilot" },
  { href: "/sandbox", icon: FlaskConical, label: "Sandbox" },
  { href: "/shift-report", icon: ClipboardList, label: "Shift report" },
  { href: "/demo", icon: Play, label: "Auto demo" },
];

export function Sidebar() {
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
    <aside className="sticky top-0 relative h-screen w-[210px] shrink-0 flex flex-col items-center pt-10 pb-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34))",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          boxShadow:
            "inset -1px 0 0 rgba(255,255,255,0.35), 1px 0 30px -10px rgba(4,18,54,0.25)",
        }}
      />
      <div className="pointer-events-none absolute top-8 bottom-8 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />

      <div className="relative z-10 px-5 mb-10 self-start">
        <div className="text-[22px] font-extrabold tracking-tight text-neutral-800 whitespace-nowrap">
          {typed}
          <span className="ml-[2px] inline-block h-[18px] w-[3px] translate-y-[2px] rounded-sm bg-emerald-600 animate-pulse align-middle" />
        </div>
      </div>

      <nav className="relative z-10 flex flex-col items-center gap-5">
        {NAV_ITEMS.map(({ icon: Icon, href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} title={label}>
              <button
                type="button"
                className={cn(
                  "group grid h-[62px] w-[62px] place-items-center rounded-[22px] transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_14px_28px_-8px_rgba(6,95,70,0.55),inset_0_1px_0_rgba(255,255,255,0.4)]"
                    : "glass-soft text-neutral-500 hover:text-neutral-800 hover:-translate-y-0.5",
                )}
              >
                <Icon
                  size={26}
                  strokeWidth={2}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </button>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 mt-auto text-[11px] font-medium tracking-wide text-neutral-400">
        v1.0
      </div>
    </aside>
  );
}
