import type { Metadata, Viewport } from "next";

export const daysparkMetadata: Metadata = {
  metadataBase: new URL("https://skelar-todoist.vercel.app"),
  title: "Dayspark — AI day planner",
  description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  applicationName: "Dayspark",
  appleWebApp: { capable: true, title: "Dayspark", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Dayspark",
    title: "Dayspark — your AI day planner",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dayspark — your AI day planner",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
  },
};

export const daysparkViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff6a3d",
};
