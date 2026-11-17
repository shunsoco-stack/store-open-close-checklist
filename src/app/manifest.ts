import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "開店・閉店チェックリスト",
    short_name: "開店・閉店",
    lang: "ja",
    description: "毎日の定型チェックと、次の担当者への申し送り。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6f2",
    theme_color: "#23624c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
