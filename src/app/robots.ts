import type { MetadataRoute } from "next";
import { URL_SITO } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${URL_SITO}/sitemap.xml`,
    host: URL_SITO,
  };
}
