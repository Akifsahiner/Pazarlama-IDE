import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, ClipboardCopy } from "lucide-react";
import { useApp } from "@renderer/state/store";
import { parseCanvasLink, splitStreamingMarkdown } from "@renderer/lib/canvasLinks";
import { linkifyCodeCitations } from "@shared/codeCitation";
import { CodeHighlight } from "@renderer/components/CodeHighlight";
import { normalizeHighlightLang } from "@renderer/lib/codeHighlight";

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace("language-", "") ?? "text";
  const text = String(children ?? "").replace(/\n$/, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span>{lang}</span>
        <button type="button" onClick={() => void copy()} className="md-code-copy">
          {copied ? <Check size={10} className="text-ok" /> : <ClipboardCopy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="md-code-body">
        <CodeHighlight code={text} lang={normalizeHighlightLang(lang)} />
      </div>
    </div>
  );
}

export function AgentMarkdown({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const navigate = useApp((s) => s.navigate);
  const setWorkSurface = useApp((s) => s.setWorkSurface);
  const focusPlanTask = useApp((s) => s.focusPlanTask);
  const resolvePlanDeepLink = useApp((s) => s.resolvePlanDeepLink);

  const openInWorkspace = useCallback(() => {
    navigate("workspace");
  }, [navigate]);

  const { markdown, streamingFence } = useMemo(() => {
    const linked = linkifyCodeCitations(content);
    return streaming
      ? splitStreamingMarkdown(linked)
      : { markdown: linked, streamingFence: null };
  }, [content, streaming]);

  const project = useApp((s) => s.project);

  const openInEditor = useCallback(
    (absPath: string, line?: number) => {
      void window.api.shell.openInEditor({ editor: "cursor", path: absPath, line });
    },
    [],
  );

  const onLinkClick = useCallback(
    (href: string, e: React.MouseEvent) => {
      const action = parseCanvasLink(href);
      if (!action) return;
      e.preventDefault();
      if (action.type === "repo-file") {
        const root =
          project?.source.kind === "folder" ? project.source.path : project?.localPath;
        if (!root) return;
        const abs = `${root.replace(/[\\/]+$/, "")}/${action.path.replace(/\\/g, "/")}`;
        openInEditor(abs, action.line);
        return;
      }
      openInWorkspace();
      if (action.type === "surface") {
        setWorkSurface(action.surface);
      } else if (action.type === "plan-playbook") {
        const resolved = resolvePlanDeepLink({ playbookId: action.playbookId });
        if (resolved) {
          focusPlanTask({ playbookId: resolved.playbookId, taskId: resolved.taskId });
        } else {
          setWorkSurface("campaign-plan");
        }
      } else if (action.type === "plan-task") {
        focusPlanTask({ taskId: action.taskId });
      } else if (action.type === "external") {
        void window.api.shell.openExternal(action.url);
      }
    },
    [openInWorkspace, setWorkSurface, focusPlanTask, resolvePlanDeepLink, project, openInEditor],
  );

  if (!content && streaming) {
    return null;
  }

  return (
    <div className={`agent-prose max-w-[92%]${streaming ? " streaming-caret" : ""}`}>
      {markdown ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              const action = href ? parseCanvasLink(href) : null;
              return (
                <a
                  href={href}
                  onClick={action ? (e) => onLinkClick(href!, e) : undefined}
                  target={action?.type === "external" ? "_blank" : undefined}
                  rel={action?.type === "external" ? "noreferrer" : undefined}
                >
                  {children}
                </a>
              );
            },
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children, ...props }) => {
              const isBlock = className || String(children).includes("\n");
              if (isBlock) return <CodeBlock className={className}>{children}</CodeBlock>;
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      ) : null}
      {streamingFence ? <pre className="streaming-fence">{streamingFence}</pre> : null}
    </div>
  );
}
