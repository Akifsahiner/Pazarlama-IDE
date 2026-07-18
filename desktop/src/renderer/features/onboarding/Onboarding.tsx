import { useEffect, useMemo, useRef, useState } from "react";

import { motion } from "framer-motion";

import { Check, Rocket, Search } from "lucide-react";

import { useApp } from "@renderer/state/store";

import type { Persona } from "@shared/types";

import { Skeleton } from "@renderer/components/Skeleton";

import { SignIn } from "./SignIn";

import { ConnectStep } from "./ConnectStep";

import { OpenProjectStep } from "./OpenProjectStep";

import { ScanTheater } from "./ScanTheater";

import { Welcome } from "./Welcome";

import {

  ONBOARDING_STEP_META,

  OnboardingStage,

  type OnboardingStepId,

} from "./OnboardingStage";



const PERSONA_CARDS: {

  id: string;

  persona: Persona;

  icon: typeof Rocket;

  title: string;

  sub: string;

}[] = [

  {

    id: "launch",

    persona: "marketing",

    icon: Rocket,

    title: "Launch & grow",

    sub: "Ship your product: landing conversion, launch plan, content, and GTM execution.",

  },

  {

    id: "sell",

    persona: "sales",

    icon: Search,

    title: "Sell",

    sub: "Find your ICP, research leads, and draft personalized outreach.",

  },

];



function PersonaStep({ onPick }: { onPick: (p: Persona) => void }) {

  return (

    <div className="grid gap-3 sm:grid-cols-2">

      {PERSONA_CARDS.map((c) => (

        <button

          key={c.id}

          onClick={() => onPick(c.persona)}

          className="group flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-[var(--accent-border)] hover:bg-elevated"

        >

          <c.icon size={20} className="text-accent" />

          <span className="text-body font-medium text-text">{c.title}</span>

          <span className="text-mini text-text-2">{c.sub}</span>

        </button>

      ))}

    </div>

  );

}



/** Post-auth success beat — a breath between signing in and the next step. */

function SignedInBeat({ email }: { email?: string }) {

  return (

    <div className="flex flex-col items-center gap-3 py-10 text-center">

      <motion.span

        initial={{ scale: 0.5, opacity: 0 }}

        animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 20 } }}

        className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok"

      >

        <Check size={22} strokeWidth={2.5} />

      </motion.span>

      <div>

        <div className="text-h3 text-text">Signed in</div>

        {email && <div className="mt-0.5 text-body-sm text-text-2">{email}</div>}

      </div>

    </div>

  );

}



export function Onboarding() {

  const auth = useApp((s) => s.auth);

  const runtime = useApp((s) => s.runtime);

  const localOnlyMode = useApp((s) => s.localOnlyMode);

  const settings = useApp((s) => s.settings);

  const hasProject = useApp((s) => s.project !== null);

  const scanning = useApp((s) => s.scanning);

  const updateSettings = useApp((s) => s.updateSettings);

  const [started, setStarted] = useState(false);

  const [personaPickedNow, setPersonaPickedNow] = useState(false);

  const [signedInBeat, setSignedInBeat] = useState(false);

  const wasSignedOut = useRef(false);

  const prevStepRef = useRef<OnboardingStepId>("welcome");

  const [direction, setDirection] = useState(1);



  const needsSignIn = auth.authEnabled && auth.state !== "signed-in";

  const resolving = auth.state === "unknown";

  const personaDone = settings.personaChosen === true || personaPickedNow;



  useEffect(() => {

    if (needsSignIn) {

      wasSignedOut.current = true;

      return;

    }

    if (wasSignedOut.current && auth.state === "signed-in") {

      wasSignedOut.current = false;

      setSignedInBeat(true);

      const t = setTimeout(() => setSignedInBeat(false), 1100);

      return () => clearTimeout(t);

    }

  }, [needsSignIn, auth.state]);



  const step: OnboardingStepId =

    !started && !hasProject

      ? "welcome"

      : needsSignIn || signedInBeat

        ? "signin"

        : runtime !== "connected" && !localOnlyMode && started && !hasProject

          ? "connect"

        : !personaDone && !hasProject

          ? "focus"

          : "project";



  const railSteps = useMemo<OnboardingStepId[]>(() => {

    const steps: OnboardingStepId[] = ["welcome"];

    if (started) {

      if (auth.authEnabled || resolving) steps.push("signin");

      if (runtime !== "connected" && !localOnlyMode) steps.push("connect");

    }

    if (!settings.personaChosen) steps.push("focus");

    steps.push("project");

    return steps;

  }, [auth.authEnabled, resolving, settings.personaChosen, started, runtime, localOnlyMode]);



  useEffect(() => {

    const prevIdx = railSteps.indexOf(prevStepRef.current);

    const nextIdx = railSteps.indexOf(step);

    if (prevIdx >= 0 && nextIdx >= 0 && prevIdx !== nextIdx) {

      setDirection(nextIdx >= prevIdx ? 1 : -1);

    }

    prevStepRef.current = step;

  }, [step, railSteps]);



  const meta = ONBOARDING_STEP_META[step];

  const stepKey = resolving ? "resolving" : step;



  if (scanning) {

    return (

      <div className="relative min-h-0 flex-1 overflow-hidden">

        <div className="app-bg" aria-hidden />

        <ScanTheater fullScreen />

      </div>

    );

  }



  return (

    <OnboardingStage

      stepKey={stepKey}

      direction={direction}

      railSteps={railSteps}

      currentStep={step}

      footer={

        step === "project" && hasProject ? (

          <div className="mt-4 flex items-center justify-center text-mini">

            <button

              onClick={() => useApp.setState({ phase: "workspace" })}

              className="text-accent transition-opacity hover:opacity-80"

            >

              Back to workspace

            </button>

          </div>

        ) : undefined

      }

    >

      {resolving ? (

        <div className="panel space-y-3 rounded-[var(--radius-lg)] p-6">

          <Skeleton className="h-5 w-2/3" />

          <Skeleton className="h-4 w-full" />

          <Skeleton className="h-9 w-full" />

          <Skeleton className="h-9 w-full" />

        </div>

      ) : step === "welcome" ? (

        <Welcome onStart={() => setStarted(true)} />

      ) : (

        <>

          <div className="mb-7 text-center">

            <h1 className="select-text text-h1 font-serif tracking-[-0.01em] text-text">{meta.title}</h1>

            <p className="mx-auto mt-2 max-w-sm select-text text-body-sm text-text-2">{meta.subtitle}</p>

          </div>



          {!auth.authEnabled && step === "project" && (

            <div className="mb-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-center text-mini text-text-3">

              Local dev mode — sign-in is disabled on this backend.

            </div>

          )}



          <div className="panel rounded-[var(--radius-lg)] p-6">

            {step === "signin" ? (

              signedInBeat ? (

                <SignedInBeat email={auth.user?.email ?? auth.email} />

              ) : (

                <SignIn />

              )

            ) : step === "connect" ? (

              <ConnectStep />

            ) : step === "focus" ? (

              <PersonaStep

                onPick={(p) => {

                  void updateSettings({ persona: p, personaChosen: true });

                  setPersonaPickedNow(true);

                }}

              />

            ) : (

              <OpenProjectStep />

            )}

          </div>

        </>

      )}

    </OnboardingStage>

  );

}

