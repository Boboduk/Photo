import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/photographers", "/models", "/portfolio", "/projects", "/terms", "/privacy", "/rules"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "daily",
  }));
}
