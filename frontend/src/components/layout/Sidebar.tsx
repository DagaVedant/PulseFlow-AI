"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/command-center", label: "Command center" },
  { href: "/digital-twin", label: "Digital twin" },
  { href: "/patient-intel", label: "Patient intel" },
  { href: "/operations", label: "Operations" },
  { href: "/copilot", label: "Copilot" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/shift-report", label: "Shift report" },
  { href: "/demo", label: "Demo" },
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
    <div className="flex items-baseline gap-6 flex-shrink-0 min-w-0">
      <span className="font-display text-[17px] font-medium whitespace-nowrap flex-shrink-0">
        {typed}
      </span>
      <nav className="flex items-baseline gap-5 min-w-0 overflow-x-auto">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "pb-1 text-[14px] transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                isActive
                  ? "text-ink font-medium border-ink"
                  : "text-muted border-transparent hover:text-ink",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
