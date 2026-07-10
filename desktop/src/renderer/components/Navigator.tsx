import {
  History,
  House,
  LayoutPanelLeft,
  Library,
  LifeBuoy,
  LogOut,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "@renderer/state/store";
import type { Route } from "@renderer/state/session";
import { Menu } from "@renderer/components/ui/Menu";

interface NavButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function NavButton({ label, active, onClick, children }: NavButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`app-no-drag relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors duration-[var(--dur-fast)] ${
        active ? "bg-accent-soft text-accent" : "text-text-3 hover:bg-surface-2 hover:text-text"
      }`}
    >
      {active && <span className="absolute left-0 h-5 w-[3px] -translate-x-[7px] rounded-full bg-accent" />}
      {children}
    </button>
  );
}

const DESTS: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: "workspace", label: "Workspace", icon: LayoutPanelLeft },
  { route: "home", label: "Dashboard", icon: House },
  { route: "runs", label: "Runs", icon: History },
  { route: "assets", label: "Assets", icon: Library },
];

/** App-level navigation rail. */
export function Navigator() {
  const route = useApp((s) => s.route);
  const navigate = useApp((s) => s.navigate);
  const auth = useApp((s) => s.auth);
  const signOut = useApp((s) => s.signOut);

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-line bg-surface py-3">
      <div className="flex flex-col items-center gap-1.5">
        {DESTS.map((d) => (
          <NavButton
            key={d.route}
            label={d.label}
            active={route === d.route}
            onClick={() => navigate(d.route)}
          >
            <d.icon size={18} />
          </NavButton>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <NavButton label="Settings" active={route === "settings"} onClick={() => navigate("settings")}>
          <SettingsIcon size={18} />
        </NavButton>
        <NavButton label="Help" active={route === "help"} onClick={() => navigate("help")}>
          <LifeBuoy size={18} />
        </NavButton>
        <Menu
          align="left"
          side="top"
          items={[
            {
              id: "account-email",
              label: auth.user?.email ?? auth.email ?? "Not signed in",
              icon: <UserRound size={14} />,
              disabled: true,
              onSelect: () => {},
            },
            {
              id: "account-settings",
              label: "Settings",
              icon: <SettingsIcon size={14} />,
              onSelect: () => navigate("settings"),
            },
            ...(auth.authEnabled
              ? [
                  {
                    id: "account-signout",
                    label: "Sign out",
                    icon: <LogOut size={14} />,
                    danger: true,
                    onSelect: () => void signOut(),
                  },
                ]
              : []),
          ]}
          trigger={({ toggle }) => (
            <button
              type="button"
              aria-label="Account"
              title={auth.user?.email ?? "Account"}
              onClick={toggle}
              className="app-no-drag mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform hover:scale-105"
            >
              <UserRound size={14} />
            </button>
          )}
        />
      </div>
    </nav>
  );
}
