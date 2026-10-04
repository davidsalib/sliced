import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Backdrop } from "@/components/Backdrop";
import { headers } from "next/headers";
import { DevPanel } from "@/components/DevPanel";
import { ServiceWorker } from "@/components/ServiceWorker";
import { getViewer } from "@/lib/auth";
import { DEV_USERS, devToolsEnabled } from "@/lib/dev";
import { CheeseDrip } from "@/components/Toppings";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "800"] });
const body = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${APP_TAGLINE}. Cards are charged automatically and whoever paid gets paid back.`,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a110d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Which dev test user is signed in, if any (localhost only). */
async function devState() {
  const host = (await headers()).get("host");
  if (!devToolsEnabled(host)) return null;
  const viewer = await getViewer().catch(() => null);
  const kind = viewer ? (Object.entries(DEV_USERS).find(([, u]) => u.email === viewer.email)?.[0] ?? viewer.role) : null;
  return { current: kind };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const dev = process.env.NODE_ENV === "development" ? await devState() : null;
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Backdrop />
        <CheeseDrip className="fixed inset-x-0 top-0 z-50" />
        {children}
        <ServiceWorker />
        {dev && <DevPanel current={dev.current} />}
      </body>
    </html>
  );
}
