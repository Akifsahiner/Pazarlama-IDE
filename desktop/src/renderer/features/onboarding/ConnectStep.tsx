import { useState } from "react";
import { useApp } from "@renderer/state/store";
import { readDemoConnectorsEnabled, setDemoConnectorsEnabled } from "@shared/demoConnectors";
import { ConnectionSetupWizard } from "@renderer/components/ConnectionSetupWizard";
import { BundledLocalServerCard } from "@renderer/components/BundledLocalServerCard";
import { SignIn } from "./SignIn";

/** Hosted connection wizard — sign in, 3-step setup, offline escape. */
export function ConnectStep() {
  const auth = useApp((s) => s.auth);
  const runtime = useApp((s) => s.runtime);
  const continueOffline = useApp((s) => s.continueOffline);
  const [demoFeed, setDemoFeed] = useState(readDemoConnectorsEnabled());

  const connected = runtime === "connected";
  const signedIn = auth.state === "signed-in" || !auth.authEnabled;

  return (
    <div className="space-y-4">
      {auth.authEnabled && auth.state !== "signed-in" && !connected && (
        <SignIn />
      )}

      {signedIn && (
        <>
          <BundledLocalServerCard prominent autoStartOnMount />
          <ConnectionSetupWizard showServerField onContinueOffline={() => continueOffline()} />
        </>
      )}

      {import.meta.env.DEV && (
        <label className="flex items-center gap-2 text-body-sm text-text-2">
          <input
            type="checkbox"
            checked={demoFeed}
            onChange={(e) => {
              setDemoFeed(e.target.checked);
              setDemoConnectorsEnabled(e.target.checked);
              if (e.target.checked) useApp.getState().refreshConnectorFeed();
              else {
                useApp.getState().clearDemoFeed();
                useApp.getState().refreshConnectorFeed();
              }
            }}
          />
          Show demo connector feed (QA only)
        </label>
      )}
    </div>
  );
}
