import { z } from "zod";

export const validateTikTokUrl = z
  .string()
  .min(1, "URL is required")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname.includes("tiktok.com");
      } catch {
        return false;
      }
    },
    {
      message: "Please enter a valid TikTok URL",
    }
  );
