"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

const navItems = [
  { href: "/chat", label: "聊天教练" },
  { href: "/dashboard", label: "仪表盘" },
  { href: "/plans/current", label: "训练计划" },
  { href: "/logs", label: "健康记录" },
  { href: "/exercises", label: "动作库" },
  { href: "/profile", label: "个人档案" }
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Health Agent</h1>
          <p>聊天驱动的健康与健身教练，支持计划生成、追问补档、工具调用与推理摘要。</p>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

