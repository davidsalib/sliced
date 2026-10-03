import { Landing } from "@/components/Landing";
import { Logo } from "@/components/Shell";
import { WeeklyView } from "@/components/views/WeeklyView";
import { getViewer, isMember } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getPosts } from "@/lib/weekly";
import { loadWeekly } from "@/lib/weekly-load";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const viewer = await getViewer();

  if (!viewer) return <Landing notice={sp.invite === "expired" ? "That invite link has expired. Ask your crew for a fresh one." : undefined} />;

  if (!isMember(viewer)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <Logo className="size-24 animate-wiggle" />
        <h1 className="font-display text-4xl font-extrabold">Almost on the crew</h1>
        <p className="text-lg text-dough">
          You&apos;re signed in as <b className="text-flour">{viewer.email}</b>. Ask someone on your service crew for the invite link, then open it here.
        </p>
        <form action="/auth/signout" method="post">
          <button className="rounded-full border border-ash px-5 py-2.5 font-semibold text-dough">Use a different account</button>
        </form>
      </main>
    );
  }

  const [settings, [post]] = await Promise.all([getSettings(), getPosts({ limit: 1 })]);
  const data = await loadWeekly(viewer, post ?? null);
  const banner = sp.welcome
    ? `Welcome to ${settings.crew_name}! Here's this week's message.`
    : sp.posted === "emailed"
      ? "Published. The email is on its way to everyone."
      : sp.posted
        ? "Published."
        : null;
  const q = sp.answer === "hope" || sp.answer === "friendship" ? sp.answer : null;

  return <WeeklyView viewer={viewer} settings={settings} post={post ?? null} answers={data.answers} older={data.older} isCurrent banner={banner} openQuestion={q} />;
}
