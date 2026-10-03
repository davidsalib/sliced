import Link from "next/link";
import { TabBar } from "@/components/TabBar";
import { Avatar } from "@/components/Avatar";
import { APP_NAME } from "@/lib/brand";
import { displayName } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="-50 -50 100 100" className={`logo ${className}`} aria-hidden>
      <circle r="46" fill="#e3a05c" />
      <circle r="39" fill="#d63a1f" />
      <circle r="36" fill="#ffc23d" />
      <path d="M0 0 L0 -46 A46 46 0 0 1 39.8 -23 Z" fill="#1a110d" transform="translate(6 -8)" />
      <circle cx="-14" cy="10" r="7" fill="#c23a24" />
      <circle cx="12" cy="16" r="6" fill="#c23a24" />
      <circle cx="-8" cy="-16" r="5.5" fill="#c23a24" />
    </svg>
  );
}

export function Shell({ viewer, crewName, activeHref, children }: { viewer: Profile; crewName: string; activeHref?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 pt-4">
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <Logo className="size-9 transition-transform duration-500 group-hover:rotate-[200deg]" />
          <span className="min-w-0">
            <span className="block font-display text-2xl leading-none font-extrabold tracking-tight">{APP_NAME}</span>
            <span className="block truncate text-xs text-dough">{crewName}</span>
          </span>
        </Link>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center rounded-full ring-2 ring-transparent transition group-open:ring-cheese [&::-webkit-details-marker]:hidden">
            <Avatar profile={viewer} size={38} />
            <span className="sr-only">Account</span>
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-ash bg-oven-2 p-2 shadow-2xl">
            <p className="truncate px-3 pt-2 font-semibold">{displayName(viewer)}</p>
            <p className="truncate px-3 pb-2 text-xs text-dough">{viewer.email}</p>
            <form action="/auth/signout" method="post">
              <button className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-oven-3">Sign out</button>
            </form>
          </div>
        </details>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-6">{children}</main>
      <TabBar isAdmin={viewer.role === "admin"} activeHref={activeHref} />
    </div>
  );
}
