"use client";

import { Card } from "@/components/ui/card";
import { UserPlus, Brain, Rocket, Trophy } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Profile",
    description: "Sign up and build your comprehensive career profile with your skills, experience, and goals."
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Analysis",
    description: "Our AI analyzes your profile, identifies skill gaps, and creates a personalized 3-month roadmap."
  },
  {
    icon: Rocket,
    step: "03",
    title: "Practice & Learn",
    description: "Use our AI Interview Coach for mock interviews and follow your roadmap to build new skills."
  },
  {
    icon: Trophy,
    step: "04",
    title: "Land Your Dream Job",
    description: "Let AI auto-match and apply to jobs while you focus on preparing for interviews."
  }
];

const HowItWorks = () => {
  const { t } = useLanguage();
  const stepsContent = t("howItWorks.steps", []);

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            {t("howItWorks.headingPrefix")} <span className="text-primary">{t("howItWorks.headingHighlight")}</span> {t("howItWorks.headingSuffix")}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/4 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
                )}

              <Card className="glass-card p-6 hover:shadow-elevated hover:border-primary/20 transition-all duration-300 hover:scale-[1.05] relative z-10">
                {/* Step Number */}
                <div className="text-6xl font-bold text-primary/20 mb-4">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="mb-4 text-primary">
                  <step.icon className="h-10 w-10" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{stepsContent[index]?.title || step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {stepsContent[index]?.description || step.description}
                </p>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
