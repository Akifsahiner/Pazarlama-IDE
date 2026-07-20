"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { headerFade } from "@/lib/animations";
import { PlatformDownloadButton } from "@/components/download/PlatformDownloadButton";
import { brand, navLinks } from "@/lib/tokens";

function Logo({ onHero }: { onHero: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${brand.name} home`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="20"
          height="20"
          rx="5"
          fill={onHero ? "rgba(255,255,255,0.14)" : "var(--ink)"}
          fillOpacity={onHero ? 1 : 0.1}
        />
        <path
          d="M6.5 8L9 11L6.5 14"
          stroke={onHero ? "#ffffff" : "var(--ink)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 14H15.5"
          stroke={onHero ? "#ffffff" : "var(--ink)"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`text-[17px] font-medium tracking-[-0.02em] ${
          onHero ? "text-white" : "text-ink"
        }`}
      >
        {brand.name}
      </span>
    </Link>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const onHero = !scrolled;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.55);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className={`z-50 flex w-full transition-all duration-300 ${
        scrolled
          ? "fixed top-0 border-b border-line bg-surface/95 py-3 backdrop-blur-md"
          : "absolute bg-transparent pt-4"
      }`}
      variants={headerFade}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5 md:px-8">
        <Logo onHero={onHero} />

        <nav
          className="hidden items-center justify-center gap-1.5 md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={
                onHero
                  ? "hero-nav-pill rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  : "rounded-full border border-line/80 bg-surface/70 px-4 py-2 text-sm font-medium text-ink-2 backdrop-blur-sm transition-colors hover:bg-surface hover:text-ink"
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-3">
          <div className="hidden md:block">
            <PlatformDownloadButton
              compact
              animated={false}
              id="header-download-button"
              className="shimmer-button--hero shimmer-button--compact"
            />
          </div>

          <button
            type="button"
            className={`flex size-10 items-center justify-center rounded-full transition-colors md:hidden ${
              onHero
                ? "border border-white/28 bg-white/14 text-white/92 backdrop-blur-xl hover:bg-white/22"
                : "text-ink-2 hover:bg-black/5 hover:text-ink"
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
