/**
 * P5 — Export Lane B outreach tracker rows to CSV for SDR / VA handoff.
 * P9 — Extended export from influencer operator workspace.
 */
import type { LaneBItem, LaneBWorkspace } from "./cmoLaneB";
import type { InfluencerOperatorWorkspace } from "./cmoInfluencerOperator";

export interface OutreachCsvRow {
  touch_id: string;
  touch_number: number;
  target_name: string;
  target_handle: string;
  channel: string;
  day: number;
  status: string;
  proof_url: string;
  proof_note: string;
  platform?: string;
  pipeline_stage?: string;
  pitch_id?: string;
  icp_fit?: string;
  utm_campaign?: string;
  promo_code?: string;
  reply_interest?: string;
  signups?: string;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function outreachTouchRows(workspace: LaneBWorkspace): OutreachCsvRow[] {
  if (workspace.mode !== "outreach_tracker") return [];

  const touches = workspace.items.filter((i) => i.title.startsWith("Touch "));
  return touches.map((item, index) => rowFromTouch(item, index + 1));
}

function rowFromTouch(item: LaneBItem, touchNumber: number): OutreachCsvRow {
  return {
    touch_id: item.id,
    touch_number: touchNumber,
    target_name: item.target_name ?? "",
    target_handle: item.target_handle ?? "",
    channel: item.channel ?? "",
    day: item.day ?? 0,
    status: item.status,
    proof_url: item.proof?.url ?? "",
    proof_note: item.proof?.note ?? "",
  };
}

export function outreachTrackerToCsv(workspace: LaneBWorkspace): string {
  const rows = outreachTouchRows(workspace);
  const header =
    "touch_id,touch_number,target_name,target_handle,channel,day,status,proof_url,proof_note";
  const body = rows.map((r) => rowToCsvLine(r));
  return [header, ...body].join("\n");
}

function rowToCsvLine(r: OutreachCsvRow): string {
  return [
    r.touch_id,
    String(r.touch_number),
    r.target_name,
    r.target_handle,
    r.channel,
    String(r.day),
    r.status,
    r.proof_url,
    r.proof_note,
    r.platform ?? "",
    r.pipeline_stage ?? "",
    r.pitch_id ?? "",
    r.icp_fit ?? "",
    r.utm_campaign ?? "",
    r.promo_code ?? "",
    r.reply_interest ?? "",
    r.signups ?? "",
  ]
    .map(csvEscape)
    .join(",");
}

export function influencerOutreachToCsv(workspace: InfluencerOperatorWorkspace): string {
  const header =
    "touch_id,touch_number,target_name,target_handle,channel,day,status,proof_url,proof_note,platform,pipeline_stage,pitch_id,icp_fit,utm_campaign,promo_code,reply_interest,signups";
  const body = workspace.touches.map((touch, index) =>
    rowToCsvLine({
      touch_id: touch.id,
      touch_number: index + 1,
      target_name: touch.target_name,
      target_handle: touch.target_handle,
      channel: "dm",
      day: touch.day_index,
      status: touch.pipeline_stage,
      proof_url: touch.proof?.thread_url ?? touch.proof?.live_post_url ?? "",
      proof_note: touch.proof?.reply_note ?? touch.proof?.note ?? "",
      platform: touch.platform,
      pipeline_stage: touch.pipeline_stage,
      pitch_id: touch.pitch_id,
      icp_fit: touch.icp_fit != null ? String(touch.icp_fit) : "",
      utm_campaign: touch.deal?.utm_campaign ?? "",
      promo_code: touch.deal?.promo_code ?? "",
      reply_interest: touch.proof?.reply_interest ?? "",
      signups: touch.proof?.signups != null ? String(touch.proof.signups) : "",
    }),
  );
  return [header, ...body].join("\n");
}

export function outreachExportFilename(projectName: string, weekIndex = 1): string {
  const safe = projectName.replace(/[^\w.-]+/g, "-").slice(0, 40) || "outreach";
  const date = new Date().toISOString().slice(0, 10);
  return `outreach-${safe}-w${weekIndex}-${date}.csv`;
}
