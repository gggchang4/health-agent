"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

const primaryNavItems = [
  { href: "/chat", label: "对话" },
  { href: "/dashboard", label: "仪表盘" },
  { href: "/plans/current", label: "计划" },
  { href: "/profile", label: "档案" },
  { href: "/logs", label: "记录" },
  { href: "/exercises", label: "动作" }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-unified-bar">
          <Link href="/chat" className="brand-wordmark">
            <Image
              src="/brand/gympal-logo.jpg"
              alt="GymPal"
              width={40}
              height={40}
              className="brand-image"
            />
            <span>GymPal</span>
          </Link>

          <nav className="nav-bar-list" aria-label="Primary navigation">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-pill ${isActive(pathname, item.href) ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="shell-bar-spacer" aria-hidden="true" />
        </div>
      </header>

      <main className="shell-main">
        <div className="shell-content">{children}</div>
      </main>
    </div>
  );
}

