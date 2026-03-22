import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getProjectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function getProjectRefFromJwt(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return decoded?.ref || null;
  } catch {
    return null;
  }
}

const urlRef = getProjectRefFromUrl(supabaseUrl);
const serviceRef = getProjectRefFromJwt(serviceRoleKey);
const anonRef = getProjectRefFromJwt(anonKey);

const selectedKey =
  serviceRoleKey && serviceRef && serviceRef === urlRef
    ? serviceRoleKey
    : anonKey;
const canUseServiceRole =
  Boolean(serviceRoleKey) && serviceRef && serviceRef === urlRef;

if (serviceRoleKey && serviceRef && urlRef && serviceRef !== urlRef) {
  console.warn("Auth signup route: SUPABASE_SERVICE_ROLE_KEY does not match NEXT_PUBLIC_SUPABASE_URL project, using anon key fallback.");
}

if (anonKey && anonRef && urlRef && anonRef !== urlRef) {
  console.warn("Auth signup route: NEXT_PUBLIC_SUPABASE_ANON_KEY does not match NEXT_PUBLIC_SUPABASE_URL project.");
}

const supabase = createClient(supabaseUrl, selectedKey);

function isRateLimitError(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("too many requests");
}

function isMissingUniquePresenceColumn(error) {
  const msg = (error?.message || "").toLowerCase();
  return msg.includes("uniquepresence") && msg.includes("does not exist");
}

export async function POST(request) {
  try {
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { message: "Name, email, phone and password are required" },
        { status: 400 }
      );
    }

    let createdUser = null;
    let createdSession = null;

    if (canUseServiceRole) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          phone,
        },
      });

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      createdUser = data?.user || null;
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (isRateLimitError(error)) {
          return NextResponse.json(
            {
              message:
                "Email rate limit exceeded. Wait a few minutes and try again, or configure a matching SUPABASE_SERVICE_ROLE_KEY for no-email signup flow.",
            },
            { status: 429 }
          );
        }
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      createdUser = data?.user || null;
      createdSession = data?.session || null;
    }

    if (!createdUser) {
      return NextResponse.json(
        { message: "User was not created" },
        { status: 400 }
      );
    }

    const { data: upsertData, error: upsertError } = await supabase
      .from("users")
      .upsert([
        {
          id: createdUser.id,
          name,
          email,
          phone,
        },
      ], { onConflict: "id" })
      .select("uniquePresence")
      .single();

    if (upsertError && !isMissingUniquePresenceColumn(upsertError)) {
      return NextResponse.json(
        { message: `Profile creation failed: ${upsertError.message}` },
        { status: 400 }
      );
    }

    const uniquePresence = upsertData?.uniquePresence || `uid:${createdUser.id}`;

    return NextResponse.json({
      message: "Account created successfully",
      user: createdUser,
      session: createdSession,
      uniquePresence,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error?.message || "Signup failed" },
      { status: 500 }
    );
  }
}
