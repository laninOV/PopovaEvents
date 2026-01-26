"use client";

import { usePathname } from "next/navigation";

export function PageContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}

