import Link from "next/link";
import { brand } from "@/lib/tokens";

export function Footer() {
  return (
    <footer className="canvas-footer">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-10 md:flex-row md:px-8 md:py-12">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="20" height="20" rx="5" fill="var(--ink)" fillOpacity="0.1" />
            <path
              d="M6.5 8L9 11L6.5 14"
              stroke="var(--ink)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M11 14H15.5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[17px] font-medium tracking-[-0.02em]">{brand.name}</span>
        </Link>

        <nav className="flex items-center gap-6" aria-label="Footer navigation">
          {["Privacy", "Terms", "Blog", "Support"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-ink-3 transition-colors hover:text-ink"
            >
              {link}
            </a>
          ))}
        </nav>

        <p className="text-sm text-ink-3">
          &copy; {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
