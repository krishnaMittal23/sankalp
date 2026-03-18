"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { useLanguage } from "@/components/providers/LanguageProvider";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-primary animate-glow" />
            </div>
            <span className="text-xl font-bold text-primary">Career AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("navbar.features")}
            </a>
            <a
              href="#how-it-works"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("navbar.howItWorks")}
            </a>
            <a
              href="#comparison"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              {t("navbar.whyUs")}
            </a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher compact />
            <Link href="/auth/login">
              <Button variant="ghost">{t("navbar.signIn")}</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="hero">{t("navbar.getStarted")}</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 animate-fade-in">
            <a
              href="#features"
              className="block text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("navbar.features")}
            </a>
            <a
              href="#how-it-works"
              className="block text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("navbar.howItWorks")}
            </a>
            <a
              href="#comparison"
              className="block text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("navbar.whyUs")}
            </a>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  {t("navbar.signIn")}
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="hero" className="w-full">
                  {t("navbar.getStarted")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
