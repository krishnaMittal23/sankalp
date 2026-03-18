import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const looksLikeHttpUrl = /^https?:\/\//i.test(supabaseUrl);

function safeDecodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);

    if (typeof atob !== "undefined") {
      return JSON.parse(atob(normalized));
    }

    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

const tokenPayload = safeDecodeJwtPayload(supabaseAnonKey);
const keyProjectRef = tokenPayload?.ref || null;
const urlProjectRef = getProjectRefFromUrl(supabaseUrl);
const hasProjectRefMismatch = Boolean(
  keyProjectRef && urlProjectRef && keyProjectRef !== urlProjectRef
);

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local"
    : !looksLikeHttpUrl
    ? "NEXT_PUBLIC_SUPABASE_URL must start with http:// or https://"
    : hasProjectRefMismatch
    ? "Supabase URL and anon key belong to different projects. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY with a key from the same Supabase project as NEXT_PUBLIC_SUPABASE_URL."
    : null;

const cookieStorage = {
  getItem: (key) => {
    if (typeof document === "undefined") return null;
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${key}=`))
      ?.split("=")[1];
  },
  setItem: (key, value) => {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  },
  removeItem: (key) => {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

export const supabase =
  typeof window !== "undefined" && !supabaseConfigError
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { storage: cookieStorage },
      })
    : null;
