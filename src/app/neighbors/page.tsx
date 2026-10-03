import Link from "next/link";
import { Shell } from "@/components/Shell";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { neighborName } from "@/lib/neighbors";
import { searchNeighbors } from "@/lib/weekly";

export const metadata = { title: "Neighbors" };

export default async function NeighborsPage(props: PageProps<"/neighbors">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const viewer = await requireMember("/neighbors");
  const [settings, people] = await Promise.all([getSettings(), searchNeighbors(q, 20)]);
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/prayers">
      <h1 className="font-display text-4xl font-extrabold">Neighbors</h1>
      <p className="mt-1 text-dough">The people we serve, with what they&apos;ve shared and what we&apos;re praying for.</p>
      <form className="mt-5" role="search">
        <label htmlFor="q" className="sr-only">
          Search names
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search by name" className="w-full rounded-2xl border border-ash bg-oven-2 px-4 py-3 outline-none focus:border-cheese" />
      </form>
      <ul className="mt-4 grid gap-1">
        {people.map((n) => (
          <li key={n.id}>
            <Link href={`/neighbors/${n.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-oven-2">
              <span className="font-semibold">{neighborName(n)}</span>
              <span className="text-xs text-dough">
                {Number(n.mentions)} {Number(n.mentions) === 1 ? "entry" : "entries"} · seen {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(n.last_seen_at))}
              </span>
            </Link>
          </li>
        ))}
        {people.length === 0 && <li className="py-6 text-center text-dough">{q ? "Nobody by that name yet." : "No neighbors yet. Names are added when you write down an answer or a prayer."}</li>}
      </ul>
    </Shell>
  );
}
