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
  const activeItem = primaryNavItems.find((item) => isActive(pathname, item.href)) ?? primaryNavItems[0];

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-brand-row">
          <Link href="/chat" className="brand-lockup">
            <Image
              src="/brand/gympal-logo.jpg"
              alt="GymPal"
              width={44}
              height={44}
              className="brand-image"
            />
            <div className="brand-copy">
              <span className="brand-kicker">Train better daily</span>
              <h1>GymPal</h1>
            </div>
          </Link>

          <div className="shell-header-copy compact">
            <span className="nav-caption">Focus</span>
            <strong>{activeItem.label}</strong>
          </div>
        </div>

        <div className="nav-bar-shell">
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
        </div>
      </header>

      <main className="shell-main">
        <div className="shell-content">{children}</div>
      </main>
    </div>
  );
}

