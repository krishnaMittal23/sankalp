"use client";

import { Card } from "@/components/ui/card";
import { Bot, TrendingUp, Zap, FileCheck, Target, Briefcase } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const features = [
  {
    icon: Bot,
    title: "AI Interview Coach",
    description: "Mock interviews with real-time feedback on tone, confidence, gestures, filler words, and speaking speed using advanced ML models.",
    color: "text-primary"
  },
  {
    icon: TrendingUp,
    title: "Smart Career Copilot",
    description: "Build a skill graph from your profile and get a personalized 3-month roadmap with relevant courses and projects.",
    color: "text-secondary"
  },
  {
    icon: Zap,
    title: "Autonomous Job Applications",
    description: "Continuously scrape jobs, rank by skill-match percentage, and auto-apply with tailored cover letters upon your approval.",
    color: "text-accent"
  },
  {
    icon: FileCheck,
    title: "Resume & Portfolio Optimization",
    description: "AI-powered suggestions to enhance your resume and portfolio, ensuring they stand out to recruiters and ATS systems.",
    color: "text-primary"
  },
  {
    icon: Target,
    title: "Progress Tracking Dashboard",
    description: "Monitor your skill growth, preparation journey, and application status all in one centralized workspace.",
    color: "text-secondary"
  },
  {
    icon: Briefcase,
    title: "Smart Job Recommendations",
    description: "Automatic job recommendations by scraping LinkedIn, Naukri, and more, perfectly matched to your profile.",
    color: "text-accent"
  }
];

const Features = () => {
  const { t } = useLanguage();
  const featureItems = t("features.items", []);

  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t("features.headingPrefix")} <span className="text-primary">{t("features.headingHighlight")}</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            {t("features.subtitle")}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 glass-card hover:shadow-elevated hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{featureItems[index]?.title || feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {featureItems[index]?.description || feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
