import { Logo } from "@/components/Shell";

export const metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="size-24 animate-wiggle" />
      <h1 className="font-display text-3xl font-extrabold">Karl the Fog ate the signal</h1>
      <p className="text-dough">Pizza Service needs a connection to show live splits. Reconnect and pull to refresh.</p>
    </main>
  );
}
