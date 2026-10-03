import { personColor } from "@/lib/colors";
import type { Profile } from "@/lib/types";

export function Avatar({ profile, size = 32, color }: { profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null | undefined; size?: number; color?: string }) {
  const name = profile?.full_name || profile?.email || "?";
  const style = { width: size, height: size, background: color ?? personColor(profile?.id ?? "x"), fontSize: size * 0.42 };
  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element -- Google avatars, tiny and already sized
    return <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={style} />;
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white" style={style} aria-hidden>
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}
