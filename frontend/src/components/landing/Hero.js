"use client";

import { Button } from "@/components/ui/button";
// import { Link } from "react-router-dom";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@/assets/image.png";
import { useLanguage } from "@/components/providers/LanguageProvider";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="AI Career Copilot"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      {/* Animated Accent Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Content */}
      <div className="container mx-auto px-4 z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            {t("hero.titlePrefix")} <span className="text-primary">{t("hero.titleHighlight")}</span>{" "}
            {t("hero.titleSuffix")}
          </h1>

          {/* Subheading */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("hero.description")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/auth/signup">
              <Button variant="hero" size="lg" className="group">
                {t("hero.startJourney")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                {t("hero.exploreFeatures")}
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-1">
              <div className="text-3xl font-bold text-primary">{t("hero.stat1Title")}</div>
              <div className="text-sm text-muted-foreground">{t("hero.stat1Text")}</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-primary">{t("hero.stat2Title")}</div>
              <div className="text-sm text-muted-foreground">{t("hero.stat2Text")}</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-primary">{t("hero.stat3Title")}</div>
              <div className="text-sm text-muted-foreground">{t("hero.stat3Text")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
