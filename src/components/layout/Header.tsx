"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { headerFade } from "@/lib/animations";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { brand, heroCopy, navLinks } from "@/lib/tokens";

function Logo({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#18181B" : "white";
  const fillOpacity = dark ? "0.1" : "0.15";

  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${brand.name} home`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="5" fill={color} fillOpacity={fillOpacity} />
        <path
          d="M6.5 8L9 11L6.5 14"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11 14H15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span
        className={`text-[17px] font-medium tracking-[-0.02em] ${
          dark ? "text-ink" : "text-white"
        }`}
      >
        {brand.name}
      </span>
    </Link>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.6);

      const downloadBtn = document.getElementById("download-button");
      if (downloadBtn) {
        const rect = downloadBtn.getBoundingClientRect();
        setShowCta(rect.bottom < 0);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className={`z-50 flex w-full transition-all duration-300 ${
        scrolled
          ? "fixed top-0 border-b border-black/6 bg-canvas/95 pt-2.5 backdrop-blur-xl"
          : "absolute pt-4"
      }`}
      variants={headerFade}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 md:px-8">
        <Logo dark={scrolled} />

        <nav
          className={`hidden items-center md:flex ${
            scrolled ? "" : "glass-nav-pill rounded-full px-1.5 py-1"
          }`}
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                scrolled
                  ? "text-ink-secondary hover:text-ink"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <motion.div
            className="hidden md:block"
            initial={false}
            animate={{
              opacity: showCta ? 1 : 0,
              pointerEvents: showCta ? "auto" : "none",
            }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
          >
            <ShimmerButton label={heroCopy.cta} compact animated={false} id="header-download-button" />
          </motion.div>

          <button
            type="button"
            className={`flex size-10 items-center justify-center rounded-lg transition-colors md:hidden ${
              scrolled
                ? "text-ink-secondary hover:bg-black/5"
                : "text-white/90 hover:bg-white/10 hover:text-white"
            }`}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
