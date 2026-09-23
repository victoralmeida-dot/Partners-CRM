"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const semSidebar =
    pathname === "/login" || pathname === "/definir-senha" || pathname === "/portal";

  if (semSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 w-full max-w-[1800px] mx-auto">{children}</main>
    </div>
  );
}
