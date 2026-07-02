"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearAuth } from "@/lib/auth";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      aria-label="Log out"
      className="h-11 w-11 flex items-center justify-center rounded border border-clinical-border bg-clinical-canvas text-muted hover:text-ink hover:bg-elevated transition-colors"
    >
      <LogOut className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
