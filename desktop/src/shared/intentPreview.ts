import type { ConversationIntent, ResolvedConversationIntent } from "./conversationIntent";

export type IntentPreviewIcon = "ask" | "edit" | "browse" | "plan" | "apply";

export interface IntentPreviewCopy {
  chipLabel: string;
  chipDetail?: string;
  icon: IntentPreviewIcon;
  /** True when Auto mode should call sendMessage (Ask path). */
  sendsAsChat: boolean;
  /** True when executeIntent will show the edit confirm modal. */
  needsConfirm: boolean;
}

export function intentPreviewIcon(intent: ConversationIntent): IntentPreviewIcon {
  switch (intent.kind) {
    case "ask_only":
      return "ask";
    case "start_edit_run":
    case "integrate_asset":
      return "edit";
    case "start_browser_task":
      return "browse";
    case "apply_pending":
      return "apply";
    case "generate_plan":
    case "preview_plan":
    case "revise_plan":
    case "run_plan_task":
    case "run_next_plan_task":
    case "log_kpi":
      return "plan";
    case "record_experiment":
      return "plan";
    default:
      return "ask";
  }
}

/** User-facing preview chip copy for Auto composer (TR-aware when message is Turkish). */
export function describeResolvedIntent(
  resolved: ResolvedConversationIntent,
  message?: string,
): IntentPreviewCopy {
  const tr = /\b(gün|düzelt|sıradaki|planı|taslak|uygula|çalıştır|yap)\b/i.test(message ?? "");
  const { intent, label, reason } = resolved;
  const icon = intentPreviewIcon(intent);

  switch (intent.kind) {
    case "ask_only":
      return {
        chipLabel: tr ? "Soru olarak gönderilecek" : "Will send as Ask",
        chipDetail: tr ? "Dosya düzenlemesi yok — strateji ve taslak yanıt." : "No file edits — strategy and drafts.",
        icon: "ask",
        sendsAsChat: true,
        needsConfirm: false,
      };
    case "start_edit_run":
      return {
        chipLabel: tr ? "Edit modunda çalıştırılacak" : "Will run in Edit project",
        chipDetail: label ?? reason ?? intent.goal.slice(0, 120),
        icon: "edit",
        sendsAsChat: false,
        needsConfirm: true,
      };
    case "start_browser_task":
      return {
        chipLabel: tr ? "Browse modunda çalıştırılacak" : "Will run in Browse",
        chipDetail: label ?? reason ?? intent.goal.slice(0, 120),
        icon: "browse",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "run_plan_task":
    case "run_next_plan_task":
      return {
        chipLabel: tr ? "Plan görevi çalıştırılacak" : "Will run plan task",
        chipDetail: label ?? reason,
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "generate_plan":
      return {
        chipLabel: tr ? "Launch plan üretilecek" : "Will generate launch plan",
        chipDetail: label,
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "preview_plan":
      return {
        chipLabel: tr ? "Plan taslağı gösterilecek" : "Will preview plan outline",
        chipDetail: label,
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "revise_plan":
      return {
        chipLabel: tr ? "Plan güncellenecek" : "Will revise launch plan",
        chipDetail: label ?? reason,
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "apply_pending":
      return {
        chipLabel: tr ? "Bekleyen değişiklikler uygulanacak" : "Will review & apply",
        chipDetail: label ?? reason,
        icon: "apply",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "integrate_asset":
      return {
        chipLabel: tr ? "Dosyaya entegre edilecek" : "Will integrate into project",
        chipDetail: label ?? reason,
        icon: "edit",
        sendsAsChat: false,
        needsConfirm: true,
      };
    case "log_kpi":
      return {
        chipLabel: tr ? "KPI kaydı açılacak" : "Will open KPI log",
        chipDetail: label,
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    case "record_experiment":
      return {
        chipLabel: tr ? "Deney kaydedilecek" : "Will record experiment",
        chipDetail: label ?? reason ?? "Pre-fill from last run and GA4.",
        icon: "plan",
        sendsAsChat: false,
        needsConfirm: false,
      };
    default:
      return {
        chipLabel: label ?? "Will run",
        chipDetail: reason,
        icon,
        sendsAsChat: false,
        needsConfirm: false,
      };
  }
}
