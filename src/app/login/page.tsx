import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/GoogleButton";
import { Logo } from "@/components/Shell";
import { getViewer } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Sign in" };

export default async function Login(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (await getViewer()) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="size-24 animate-wiggle" />
      <h1 className="font-display text-4xl font-extrabold">Sign in to {APP_NAME}</h1>
      <p className="text-dough">{next.startsWith("/join/") ? "Sign in to join your service crew." : "Use the Google account your crew knows you by."}</p>
      {sp.error && <p className="font-semibold text-tomato">Sign-in didn&apos;t finish. Try again.</p>}
      <div className="w-full">
        <GoogleButton next={next} />
      </div>
    </main>
  );
}
