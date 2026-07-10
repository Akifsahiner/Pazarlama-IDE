import { useEffect, useMemo, useState } from "react";

import { Check, Loader2, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { useApp } from "@renderer/state/store";

import { IconButton } from "@renderer/components/ui/IconButton";

import { ConfirmDialog } from "@renderer/components/ui/Dialog";

import type { ServerSession } from "@shared/types";



interface SessionHistoryProps {

  onClose: () => void;

}



function relativeTime(iso: string): string {

  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return "";

  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));

  if (mins < 1) return "now";

  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString();

}



function SessionRow({

  session,

  preview,

  messageCount,

  active,

  loading,

  onResume,

  onRename,

  onDelete,

}: {

  session: ServerSession;

  preview?: string;

  messageCount?: number;

  active: boolean;

  loading: boolean;

  onResume: () => void;

  onRename: (title: string) => void;

  onDelete: () => void;

}) {

  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState(session.title);



  if (editing) {

    return (

      <li className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-surface-2 px-1.5 py-1">

        <input

          value={title}

          onChange={(e) => setTitle(e.target.value)}

          onKeyDown={(e) => {

            if (e.key === "Enter") {

              onRename(title.trim() || "New session");

              setEditing(false);

            } else if (e.key === "Escape") {

              setTitle(session.title);

              setEditing(false);

            }

          }}

          autoFocus

          aria-label="Session title"

          className="min-w-0 flex-1 rounded-[4px] bg-transparent px-1 py-1 text-mini text-text outline-none"

        />

        <IconButton

          label="Save name"

          size="sm"

          onClick={() => {

            onRename(title.trim() || "New session");

            setEditing(false);

          }}

        >

          <Check size={12} />

        </IconButton>

        <IconButton

          label="Cancel"

          size="sm"

          onClick={() => {

            setTitle(session.title);

            setEditing(false);

          }}

        >

          <X size={12} />

        </IconButton>

      </li>

    );

  }



  return (

    <li className="group flex items-center gap-1">

      <button

        onClick={onResume}

        disabled={loading}

        className={`flex min-w-0 flex-1 items-start gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors ${

          active ? "bg-accent-soft text-text" : "text-text-2 hover:bg-surface-2"

        }`}

      >

        {loading ? (

          <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin" />

        ) : (

          <MessageSquare size={13} className="mt-0.5 shrink-0" />

        )}

        <span className="min-w-0 flex-1">

          <span className="block truncate text-mini text-inherit">{session.title}</span>

          {preview ? (

            <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-text-3">{preview}</span>

          ) : null}

          <span className="mt-0.5 block text-[10px] text-text-3">
            {messageCount != null && messageCount > 0
              ? `${messageCount} message${messageCount === 1 ? "" : "s"} · `
              : ""}
            {relativeTime(session.updated_at)}
          </span>

        </span>

      </button>

      <IconButton

        label="Rename session"

        size="sm"

        className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"

        onClick={() => setEditing(true)}

      >

        <Pencil size={12} />

      </IconButton>

      <IconButton

        label="Delete session"

        size="sm"

        className="opacity-0 hover:!text-danger focus-visible:opacity-100 group-hover:opacity-100"

        onClick={onDelete}

      >

        <Trash2 size={12} />

      </IconButton>

    </li>

  );

}



export function SessionHistory({ onClose }: SessionHistoryProps) {

  const sessions = useApp((s) => s.sessions);

  const sessionPreviews = useApp((s) => s.sessionPreviews);

  const sessionMessageCounts = useApp((s) => s.sessionMessageCounts);

  const activeSessionId = useApp((s) => s.activeSessionId);

  const activeProjectId = useApp((s) => s.activeProjectId);

  const resumeSession = useApp((s) => s.resumeSession);

  const createNewSession = useApp((s) => s.createNewSession);

  const deleteSession = useApp((s) => s.deleteSession);

  const renameSession = useApp((s) => s.renameSession);

  const loadSessionPreviews = useApp((s) => s.loadSessionPreviews);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);



  useEffect(() => {

    if (activeProjectId) {

      void useApp.getState().syncSessions(activeProjectId);

    }

  }, [activeProjectId]);



  useEffect(() => {

    if (sessions.length === 0) return;

    const missing = sessions.filter((s) => !sessionPreviews[s.id]).map((s) => s.id);

    if (missing.length > 0) void loadSessionPreviews(missing);

  }, [sessions, sessionPreviews, loadSessionPreviews]);



  const filtered = useMemo(() => {

    const q = query.trim().toLowerCase();

    if (!q) return sessions;

    return sessions.filter((s) => {

      const preview = sessionPreviews[s.id] ?? "";

      return s.title.toLowerCase().includes(q) || preview.toLowerCase().includes(q);

    });

  }, [sessions, query, sessionPreviews]);



  const confirmTarget = sessions.find((s) => s.id === confirmDeleteId);



  return (

    <div className="flex h-full flex-col bg-surface">

      <div className="flex items-center justify-between border-b border-line px-3 py-2">

        <span className="text-label font-medium text-text">Session history</span>

        <IconButton label="Close history (Esc)" size="sm" onClick={onClose}>

          <X size={13} />

        </IconButton>

      </div>



      {sessions.length > 3 && (

        <div className="border-b border-line p-2">

          <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-2 py-1">

            <Search size={12} className="shrink-0 text-text-3" />

            <input

              value={query}

              onChange={(e) => setQuery(e.target.value)}

              placeholder="Search sessions…"

              aria-label="Search sessions"

              className="min-w-0 flex-1 bg-transparent text-mini text-text outline-none placeholder:text-text-3"

            />

          </div>

        </div>

      )}



      <div className="flex-1 overflow-y-auto p-2">

        {filtered.length === 0 ? (

          <p className="px-2 py-4 text-center text-mini text-text-3">

            {sessions.length === 0 ? "No sessions yet — start one below." : "No sessions match."}

          </p>

        ) : (

          <ul className="space-y-0.5">

            {filtered.map((s) => (

              <SessionRow

                key={s.id}

                session={s}

                preview={sessionPreviews[s.id]}

                messageCount={sessionMessageCounts[s.id]}

                active={s.id === activeSessionId}

                loading={loadingId === s.id}

                onResume={() => {

                  setLoadingId(s.id);

                  void resumeSession(s.id).finally(() => setLoadingId(null));

                }}

                onRename={(title) => void renameSession(s.id, title)}

                onDelete={() => setConfirmDeleteId(s.id)}

              />

            ))}

          </ul>

        )}

      </div>



      <div className="border-t border-line p-2">

        <button

          onClick={() => void createNewSession()}

          disabled={!activeProjectId}

          className="btn-accent flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-mini disabled:opacity-40"

        >

          <Plus size={14} /> New session

        </button>

      </div>



      <ConfirmDialog

        open={confirmDeleteId !== null}

        onClose={() => setConfirmDeleteId(null)}

        onConfirm={() => {

          if (confirmDeleteId) void deleteSession(confirmDeleteId);

        }}

        title="Delete session?"

        description={

          confirmTarget

            ? `"${confirmTarget.title}" and its messages will be removed. This cannot be undone.`

            : undefined

        }

        confirmLabel="Delete"

      />

    </div>

  );

}

