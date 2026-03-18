"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function SignupPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();

    console.log("🚀 Form submitted. Creating account...");
    setMsg(t("auth.creatingAccount"));

    try {
      // 1️⃣ Create user through server auth route
      console.log("1️⃣ Calling server signup endpoint for:", { email });
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password: pass,
        }),
      });

      const signupResult = await signupResponse.json();
      console.log("   Signup endpoint response:", {
        status: signupResponse.status,
        body: signupResult,
      });

      if (!signupResponse.ok) {
        throw new Error(signupResult?.message || "Failed to create account");
      }

      const uniquePresence = signupResult?.uniquePresence;
      if (!uniquePresence) throw new Error("Failed to get uniquePresence token from insert response");
      console.log("   ✅ Signup successful. uniquePresence token:", uniquePresence);
      
      // Store token in cookie
      document.cookie = `uniquePresence=${uniquePresence}; path=/; max-age=31536000; SameSite=Lax`;
      console.log("   🍪 Cookie 'uniquePresence' set.");

      // 3️⃣ Call MongoDB API to create profile
      const profilePayload = {
        name,
        email,
        phone,
        location: "",
        title: "",
        bio: "",
        linkedin: "",
        github: "",
        website: "",
        joinDate: new Date().toLocaleString("default", { month: "long", year: "numeric" })
      };
      console.log("3️⃣ Calling MongoDB API '/api/saveProfile' with payload:", profilePayload);
      const profileResponse = await fetch("/api/saveProfile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const profileResult = await profileResponse.json();
      console.log("   MongoDB API response:", { status: profileResponse.status, body: profileResult });
      if (profileResult.status !== "success") {
        console.warn("MongoDB profile creation may have failed:", profileResult.message);
      } else {
        console.log("   ✅ MongoDB profile creation successful.");
      }

      // 4️⃣ Success message and redirect
      console.log("✅ All steps completed successfully! Redirecting...");
      setMsg(t("auth.accountCreated"));
      setTimeout(() => router.push('/dashboard'), 2000);

    } catch (err) {
      console.error("❌ Signup error caught:", err);
      if (err instanceof TypeError && /fetch/i.test(err.message || "")) {
        setMsg("Could not reach auth API. Check that frontend dev server is running.");
      } else {
        setMsg(err.message || "Failed to create account");
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background blobs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div 
        className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Card with glass effect */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {t("auth.signupTitle")}
              </h3>
              <p className="text-slate-400 text-sm">{t("auth.signupSubtitle")}</p>
            </div>

            <div className="flex justify-end">
              <LanguageSwitcher compact />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">{t("auth.fullName")}</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={e=>setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">{t("auth.email")}</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">{t("auth.phone")}</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="+91 9876543210"
                type="tel"
                value={phone}
                onChange={e=>setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">{t("auth.password")}</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="••••••••"
                type="password"
                value={pass}
                onChange={e=>setPass(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-lg hover:shadow-primary/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {t("auth.createAccount")}
            </button>

            {msg && (
              <div className={`text-sm p-3 rounded-lg ${
                msg.includes("successfully") 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : msg.includes("Creating")
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {msg}
              </div>
            )}

            <p className="text-xs text-slate-500 text-center pt-2">
              {t("auth.terms")}
            </p>
            <p className="text-sm text-slate-400">
                {t("auth.yesAccount")} {" "}
                <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                  {t("auth.login")}
                </a>
              </p>
            
          </form>
        </div>
      </div>
    </div>
  );
}