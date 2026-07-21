import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dayspark",
    short_name: "Dayspark",
    description: "Brain-dump your day. AI turns the chaos into a clear plan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ec",
    theme_color: "#ff6a3d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
