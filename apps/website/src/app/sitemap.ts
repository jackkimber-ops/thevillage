import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://thevillagesaigon.com/", alternates: { languages: { en: "https://thevillagesaigon.com/", vi: "https://thevillagesaigon.com/vi" } } },
    { url: "https://thevillagesaigon.com/vi", alternates: { languages: { en: "https://thevillagesaigon.com/", vi: "https://thevillagesaigon.com/vi" } } },
  ];
}
