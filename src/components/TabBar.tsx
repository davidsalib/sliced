"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Pep } from "@/components/Toppings";

const tabs = [
  { href: "/", label: "Week", icon: "M12 3v18M7 8h10M5 21h14" },
  { href: "/pizza", label: "Pizza", icon: "M12 2 2 20h20L12 2Zm0 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-3 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" },
  { href: "/prayers", label: "Prayers", icon: "M12 21c-1-3-1-6 0-9M12 12c-2-1-3.5-3-3.5-6 0-1.5 1-3 2-3.5M12 12c2-1 3.5-3 3.5-6 0-1.5-1-3-2-3.5M8.5 6 6 13l3 6M15.5 6 18 13l-3 6" },
  { href: "/wallet", label: "Wallet", icon: "M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2" },
];

/** Which tab owns a path. */
const owner = (path: string) =>
  path.startsWith("/pizza") || path.startsWith("/r/") || path.startsWith("/new")
    ? "/pizza"
    : path.startsWith("/prayers") || path.startsWith("/neighbors")
      ? "/prayers"
      : path.startsWith("/wallet")
        ? "/wallet"
        : path.startsWith("/admin")
          ? "/admin"
          : "/";

export function TabBar({ isAdmin, activeHref }: { isAdmin: boolean; activeHref?: string }) {
  const current = usePathname();
  const pathname = activeHref ?? current;
  const all = isAdmin ? [...tabs, { href: "/admin", label: "Crew", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12l2-1-1-3-2 .2-1.5-1.5.2-2-3-1-1 2h-2l-1-2-3 1 .2 2L5.5 8.2 3.5 8l-1 3 2 1v2l-2 1 1 3 2-.2 1.5 1.5-.2 2 3 1 1-2h2l1 2 3-1-.2-2 1.5-1.5 2 .2 1-3-2-1Z" }] : tabs;
  const active = (href: string) => owner(pathname) === href;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ash/60 bg-oven/90 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-xl">
        {all.map((t) => {
          const on = active(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 px-2 pt-3 pb-2.5 text-xs font-semibold transition-colors ${on ? "text-flour" : "text-dough hover:text-flour"}`}
              >
                {on && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-x-4 top-1.5 bottom-1.5 -z-10 rounded-2xl bg-oven-3"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  >
                    <Pep size={12} className="absolute -top-1 -right-1" />
                  </motion.span>
                )}
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
