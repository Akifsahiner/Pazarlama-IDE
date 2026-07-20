import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/hero/Hero";
import { PostHeroBridge } from "@/components/sections/PostHeroBridge/PostHeroBridge";
import { FirstRunFunnel } from "@/components/sections/FirstRunFunnel/FirstRunFunnel";
import { HowItWorks } from "@/components/sections/HowItWorks/HowItWorks";
import { WorkspacePreview } from "@/components/sections/WorkspacePreview/WorkspacePreview";
import { ExecuteTogether } from "@/components/sections/ExecuteTogether/ExecuteTogether";
import { MeasureImprove } from "@/components/sections/MeasureImprove/MeasureImprove";
import { FAQ } from "@/components/sections/FAQ/FAQ";
import { FooterCTA } from "@/components/sections/FooterCTA/FooterCTA";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <main className="canvas-main">
        <PostHeroBridge />
        <FirstRunFunnel />
        <HowItWorks />
        <WorkspacePreview />
        <ExecuteTogether />
        <MeasureImprove />
        <FAQ />
        <FooterCTA />
      </main>
      <Footer />
    </>
  );
}
