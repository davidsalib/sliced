import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { NewRequestForm } from "@/components/NewRequestForm";
import { Logo, Shell } from "@/components/Shell";
import { HomeView } from "@/components/views/HomeView";
import { NeighborView } from "@/components/views/NeighborView";
import { PrayersView } from "@/components/views/PrayersView";
import { WeeklyView } from "@/components/views/WeeklyView";
import { PostEditor } from "@/components/PostEditor";
import { answerRows, groupByWeek, prayerRows } from "@/lib/rows";
import { RequestView } from "@/components/views/RequestView";
import { WalletView } from "@/components/views/WalletView";
import { displayName } from "@/lib/auth-shared";
import { chargePlan, splitShares } from "@/lib/split";
import type { Answer, Neighbor, NeighborHit, Participant, Prayer, Profile, Settings, SpendRequest, WeeklyPost } from "@/lib/types";

/**
 * Dev-only gallery of every screen with sample data, for design work and screenshots.
 * Visit /dev/preview/week, /answer, /editor, /prayers, /neighbor, /pizza, /split, /logged, /sliced, /new, /wallet, /admin or /waiting.
 * Returns 404 in production. Everyone and everything here is sample data.
 */

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 86_400_000;

const settings: Settings = {
  id: 1,
  crew_name: "Mission Service Crew",
  days_before_slice: 2,
  charge_time: "18:00:00",
  timezone: "America/Los_Angeles",
  fees_paid_by: "eaters",
  invite_code: "a1b2c3d4e5f6",
  updated_at: iso(now),
};

function person(id: string, name: string, extra: Partial<Profile> = {}): Profile {
  return {
    id,
    email: `${name.toLowerCase()}@example.com`,
    full_name: name,
    avatar_url: null,
    role: "member",
    auto_join: true,
    has_card: true,
    card_label: "Visa •••• 4242",
    can_receive: false,
    created_at: iso(now - 60 * DAY),
    ...extra,
  };
}

const viewer = person("u-jordan", "Jordan", { role: "admin", auto_join: false, can_receive: true });
const crew = [
  person("u-maya", "Maya", { can_receive: true }),
  viewer,
  person("u-priya", "Priya"),
  person("u-sam", "Sam"),
  person("u-theo", "Theo"),
  person("u-lena", "Lena"),
  person("u-omar", "Omar", { auto_join: false }),
  person("u-zoe", "Zoe", { role: "pending", has_card: false, auto_join: false }),
];
const people = new Map(crew.map((p) => [p.id, p]));

const openReq: SpendRequest = {
  id: "req-open",
  payer_id: "u-maya",
  amount_cents: 3980,
  note: "2 pepperoni, 2 cheese",
  payer_eats: true,
  status: "open",
  slice_at: iso(now + DAY + 4 * 3_600_000 + 12 * 60_000),
  sliced_at: null,
  created_at: iso(now - 20 * 3_600_000),
};
const openParts: Participant[] = ["u-maya", "u-priya", "u-sam", "u-theo", "u-lena"].map((id, i) => ({
  request_id: openReq.id,
  user_id: id,
  kind: i === 0 ? "payer" : "subscriber",
  share_cents: null,
  charge_cents: null,
  status: "in",
  payment_intent_id: null,
  failure: null,
  joined_at: iso(now - 19 * 3_600_000 + i * 60_000),
}));

const slicedReq: SpendRequest = {
  ...openReq,
  id: "req-sliced",
  payer_id: "u-jordan",
  amount_cents: 2985,
  note: "3 cheese",
  status: "sliced",
  slice_at: iso(now - 6 * DAY),
  sliced_at: iso(now - 6 * DAY),
  created_at: iso(now - 8 * DAY),
};
const slicedIds = ["u-jordan", "u-maya", "u-priya", "u-sam", "u-theo", "u-omar"];
const shares = splitShares(slicedReq.amount_cents, slicedIds.map((id) => ({ id, isPayer: id === "u-jordan" })));
const slicedParts: Participant[] = slicedIds.map((id, i) => {
  const share = shares.get(id)!;
  const isPayer = id === "u-jordan";
  const failed = id === "u-theo";
  return {
    request_id: slicedReq.id,
    user_id: id,
    kind: isPayer ? "payer" : id === "u-omar" ? "once" : "subscriber",
    share_cents: share,
    charge_cents: isPayer ? 0 : chargePlan(share, "eaters").charge,
    status: isPayer ? "covered" : failed ? "failed" : "paid",
    payment_intent_id: null,
    failure: failed ? "Your card was declined." : null,
    joined_at: iso(now - 8 * DAY + i * 60_000),
  };
});

const olderReq: SpendRequest = { ...slicedReq, id: "req-older", payer_id: "u-maya", amount_cents: 3980, sliced_at: iso(now - 13 * DAY), created_at: iso(now - 15 * DAY) };
const olderParts: Participant[] = slicedParts.map((p) => ({
  ...p,
  request_id: olderReq.id,
  kind: p.user_id === "u-maya" ? "payer" : "subscriber",
  status: p.user_id === "u-maya" ? "covered" : "paid",
  charge_cents: p.user_id === "u-maya" ? 0 : chargePlan(Math.round(3980 / 6), "eaters").charge,
  failure: null,
}));

const parts = new Map([
  [openReq.id, openParts],
  [slicedReq.id, slicedParts],
  [olderReq.id, olderParts],
]);

// ---------------------------------------------------------------------------
// Weekly message, neighbors, prayers (sample data; gospel text is the public-domain World English Bible)
// ---------------------------------------------------------------------------
const post: WeeklyPost = {
  id: "post-1",
  week_of: "2026-10-04",
  title: "Love one another",
  gospel_reference: "John 15:9–13",
  gospel_text:
    "Even as the Father has loved me, I also have loved you. Remain in my love. If you keep my commandments, you will remain in my love; even as I have kept my Father's commandments, and remain in his love. I have spoken these things to you, that my joy may remain in you, and that your joy may be made full.\n\nThis is my commandment, that you love one another, even as I have loved you. Greater love has no one than this, that someone lay down his life for his friends.",
  message:
    "Jesus doesn't call us servants here. He calls us friends. This week, slow down at every stop. Learn one new thing about each person you meet, and tell them yours. A slice of pizza is the start of the conversation, not the end of it.",
  hope_question: "What is one thing you're hoping for this week?",
  friendship_question: "Who is someone who really knows you, and how did you meet?",
  published: true,
  published_at: iso(now - 2 * DAY),
  emailed_at: iso(now - 2 * DAY),
  created_by: "u-jordan",
  created_at: iso(now - 2 * DAY),
  updated_at: iso(now - 2 * DAY),
};
const olderPosts = [
  { id: "post-0", week_of: "2026-09-27", title: "The lost sheep", gospel_reference: "Luke 15:3–7", published: true, answerCount: 9 },
  { id: "post-00", week_of: "2026-09-20", title: null, gospel_reference: "Matthew 25:34–40", published: true, answerCount: 12 },
];

function nb(id: string, first: string, last: string | null, metDaysAgo: number, seenDaysAgo: number): Neighbor {
  return { id, first_name: first, last_name: last, created_by: "u-jordan", created_at: iso(now - metDaysAgo * DAY), last_seen_at: iso(now - seenDaysAgo * DAY) };
}
const neighborList = [
  nb("n-maria", "Maria", "G", 40, 1),
  nb("n-marcus", "Marcus", "Bell", 20, 8),
  nb("n-james", "James", "T", 33, 1),
  nb("n-darnell", "Darnell", "W", 12, 2),
  nb("n-rosa", "Rosa", null, 6, 6),
  nb("n-pete", "Pete", "M", 27, 9),
];
const neighbors = new Map(neighborList.map((n) => [n.id, n]));
const sampleHits: NeighborHit[] = neighborList.map((n, i) => ({ id: n.id, first_name: n.first_name, last_name: n.last_name, last_seen_at: n.last_seen_at, mentions: [6, 2, 4, 3, 1, 2][i] }));

const ans = (id: string, question: "hope" | "friendship", neighbor: string, answer: string, by: string, hoursAgo: number): Answer => ({
  id,
  post_id: post.id,
  question,
  neighbor_id: neighbor,
  answer,
  recorded_by: by,
  created_at: iso(now - hoursAgo * 3_600_000),
});
const weekAnswers: Answer[] = [
  ans("a1", "hope", "n-maria", "That my daughter calls me back. It's been two months.", "u-priya", 20),
  ans("a2", "hope", "n-james", "Getting my ID replaced so I can start at the warehouse.", "u-jordan", 19),
  ans("a3", "friendship", "n-darnell", "My brother Kev. We used to fix bikes together on Valencia.", "u-sam", 18),
  ans("a4", "friendship", "n-maria", "Sister Ann at the shelter. She remembers how I take my coffee.", "u-priya", 17),
];
const prayerList: Prayer[] = [
  { id: "p1", neighbor_id: "n-maria", anonymous: false, request: "Healing for her knee, and that her daughter calls back.", submitted_by: "u-priya", created_at: iso(now - 20 * 3_600_000) },
  { id: "p2", neighbor_id: null, anonymous: true, request: "Safety for a family sleeping in their car near the Panhandle.", submitted_by: "u-sam", created_at: iso(now - 30 * 3_600_000) },
  { id: "p3", neighbor_id: "n-james", anonymous: false, request: "Strength for his first week back at work.", submitted_by: "u-jordan", created_at: iso(now - 2 * DAY) },
  { id: "p4", neighbor_id: "n-pete", anonymous: false, request: "A bed at the Navigation Center before the rain.", submitted_by: "u-lena", created_at: iso(now - 9 * DAY) },
  { id: "p5", neighbor_id: null, anonymous: true, request: "Peace for someone grieving his dog.", submitted_by: "u-omar", created_at: iso(now - 10 * DAY) },
];

export default async function Preview(props: PageProps<"/dev/preview/[screen]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await props.params;

  switch (screen) {
    case "week":
    case "answer": {
      const rows = answerRows(weekAnswers, neighbors, people, viewer);
      return (
        <WeeklyView
          viewer={viewer}
          settings={settings}
          post={post}
          answers={{ hope: rows.filter((r, i) => weekAnswers[i].question === "hope"), friendship: rows.filter((r, i) => weekAnswers[i].question === "friendship") }}
          older={olderPosts}
          openQuestion={screen === "answer" ? "hope" : null}
          sampleHits={sampleHits}
          activeHref="/"
        />
      );
    }
    case "editor":
      return (
        <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/">
          <h1 className="font-display text-4xl font-extrabold">This week&apos;s message</h1>
          <p className="mt-1 text-dough">The gospel, a message to share, and two questions to ask our neighbors. Publishing emails everyone.</p>
          <PostEditor post={{ ...post, published: false, published_at: null }} defaultWeekOf={post.week_of} />
        </Shell>
      );
    case "prayers":
      return (
        <PrayersView
          viewer={viewer}
          settings={settings}
          groups={groupByWeek(prayerList).map((g) => ({ label: g.label, rows: prayerRows(g.items, neighbors, people, viewer) }))}
          sampleHits={sampleHits}
          activeHref="/prayers"
        />
      );
    case "neighbor":
      return (
        <NeighborView
          viewer={viewer}
          settings={settings}
          neighbor={neighbors.get("n-maria")!}
          activeHref="/prayers"
          answers={[
            { id: "x1", postId: post.id, week: "Oct 4", question: "hope", questionText: post.hope_question, answer: weekAnswers[0].answer, recordedBy: "Priya" },
            { id: "x2", postId: post.id, week: "Oct 4", question: "friendship", questionText: post.friendship_question, answer: weekAnswers[3].answer, recordedBy: "Priya" },
            { id: "x3", postId: "post-0", week: "Sep 27", question: "hope", questionText: "What would make tomorrow a good day?", answer: "Dry socks and a hot meal. Today I got both.", recordedBy: "you" },
          ]}
          prayers={[
            { id: "y1", request: prayerList[0].request, when: "Oct 2, 2026", by: "Priya" },
            { id: "y2", request: "That the clinic can see her before winter.", when: "Sep 26, 2026", by: "Sam" },
          ]}
        />
      );
    case "pizza":
      return <HomeView viewer={viewer} settings={settings} open={[openReq]} past={[slicedReq, olderReq]} parts={parts} people={people} live={false} activeHref="/pizza" />;
    case "split":
      return <RequestView viewer={viewer} settings={settings} request={openReq} participants={openParts} people={people} live={false} activeHref="/pizza" />;
    case "logged":
      return (
        <RequestView
          viewer={{ ...people.get("u-maya")!, role: "member" }}
          settings={settings}
          request={openReq}
          participants={openParts}
          people={people}
          isNew
          live={false}
          activeHref="/pizza"
        />
      );
    case "sliced":
      return (
        <RequestView
          viewer={{ ...people.get("u-theo")!, role: "member" }}
          settings={settings}
          request={slicedReq}
          participants={slicedParts}
          people={people}
          live={false}
          activeHref="/pizza"
        />
      );
    case "new":
      return (
        <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/new">
          <h1 className="font-display text-4xl font-extrabold">I picked up pizza</h1>
          <p className="mt-1 text-dough">Log what you spent on this week&apos;s service pizza. The crew gets an email and the pie is sliced Sat, Oct 4, 6:00 PM.</p>
          <NewRequestForm subscribers={4} feesPaidBy="eaters" initialAmount="39.80" />
        </Shell>
      );
    case "wallet":
      return (
        <WalletView
          viewer={{ ...viewer, auto_join: true }}
          settings={settings}
          hasStripeAccount
          charges={[{ ...openParts[1], user_id: viewer.id }, { ...olderParts[2], user_id: viewer.id }]}
          requestsById={new Map([openReq, olderReq].map((r) => [r.id, r]))}
          paidFor={[slicedReq]}
          bankMsg={null}
          setupIntentReturn={null}
          activeHref="/wallet"
        />
      );
    case "admin":
      return (
        <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/admin">
          <h1 className="font-display text-4xl font-extrabold">Crew settings</h1>
          <AdminPanel
            settings={settings}
            inviteUrl={`https://pizzaservice.app/join/${settings.invite_code}`}
            people={crew.map((p) => ({ ...p, name: displayName(p), isMe: p.id === viewer.id }))}
          />
        </Shell>
      );
    case "waiting":
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
          <Logo className="size-24 animate-wiggle" />
          <h1 className="font-display text-4xl font-extrabold">Almost on the crew</h1>
          <p className="text-lg text-dough">
            You&apos;re signed in as <b className="text-flour">zoe@example.com</b>. Ask someone on your service crew for the invite link, then open it here.
          </p>
          <span className="rounded-full border border-ash px-5 py-2.5 font-semibold text-dough">Use a different account</span>
        </main>
      );
    default:
      notFound();
  }
}
