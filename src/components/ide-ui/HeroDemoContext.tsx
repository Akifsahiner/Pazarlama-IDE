"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HeroIDEDemoState } from "./useHeroIDEDemo";

const HeroDemoContext = createContext<HeroIDEDemoState | null>(null);

export function HeroDemoProvider({
  demo,
  children,
}: {
  demo: HeroIDEDemoState;
  children: ReactNode;
}) {
  return <HeroDemoContext.Provider value={demo}>{children}</HeroDemoContext.Provider>;
}

export function useHeroDemoContext() {
  return useContext(HeroDemoContext);
}
