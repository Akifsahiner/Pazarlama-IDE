import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DownloadPageClient } from "@/components/download/DownloadPageClient";

export const metadata = {
  title: "Download — Marketing IDE",
  description: "Download Marketing IDE for Windows, macOS, or Linux.",
};

export default function DownloadPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-bg pt-28 pb-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Desktop app
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.03em] text-ink md:text-5xl">
            Download Marketing IDE
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-ink-2">
            Local-first GTM IDE for developers — connect for AI or preview offline. We detect your
            device and highlight the right installer.
          </p>
          <DownloadPageClient />
          <p className="mt-10 text-sm text-ink-3">
            <Link href="/" className="text-accent hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
