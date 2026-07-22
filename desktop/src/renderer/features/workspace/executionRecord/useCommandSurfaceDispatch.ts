import type { CommandSurfaceAction, CommandSurfaceGovernance } from "@shared/cmoCommandSurface";
import { canDispatchOpsTask } from "@shared/morningBrief";
import { useApp } from "@renderer/state/store";

/** Shared dispatch for ExecutionRecordCard primary CTA. */
export function useCommandSurfaceDispatch() {
  const retryExecutionTask = useApp((s) => s.retryExecutionTask);
  const startOpsSystemTask = useApp((s) => s.startOpsSystemTask);
  const openOpsProofModal = useApp((s) => s.openOpsProofModal);
  const openDistributionProofModal = useApp((s) => s.openDistributionProofModal);
  const openInfluencerProofModal = useApp((s) => s.openInfluencerProofModal);
  const openInfluencerDealModal = useApp((s) => s.openInfluencerDealModal);
  const openDelegateRubricModal = useApp((s) => s.openDelegateRubricModal);
  const openProductRequestModal = useApp((s) => s.openProductRequestModal);
  const openProductIssueModal = useApp((s) => s.openProductIssueModal);
  const openMonetizationTaskModal = useApp((s) => s.openMonetizationTaskModal);
  const openMonetizationIssueModal = useApp((s) => s.openMonetizationIssueModal);
  const openWeekReviewModal = useApp((s) => s.openWeekReviewModal);
  const startNextCmoCycle = useApp((s) => s.startNextCmoCycle);
  const openHumanTaskKitDrawer = useApp((s) => s.openHumanTaskKitDrawer);
  const openLaneBProofModal = useApp((s) => s.openLaneBProofModal);
  const focusWarRoomAnchor = useApp((s) => s.focusWarRoomAnchor);
  const beginQuickStartShip = useApp((s) => s.beginQuickStartShip);
  const promptApplyFirstChange = useApp((s) => s.promptApplyFirstChange);
  const laneDWorkspace = useApp((s) => s.laneDWorkspace ?? s.marketingProfile?.lane_d_workspace);
  const setExecutionRecordDetailTab = useApp((s) => s.setExecutionRecordDetailTab);

  return (
    resolved: CommandSurfaceAction,
    governance?: CommandSurfaceGovernance | null,
  ) => {
    if (!canDispatchOpsTask(governance, resolved)) return;

    switch (resolved.kind) {
      case "ship_first":
        if (resolved.label.includes("Apply")) promptApplyFirstChange();
        else beginQuickStartShip();
        setExecutionRecordDetailTab("diff");
        break;
      case "run_system":
        startOpsSystemTask(resolved.taskId);
        setExecutionRecordDetailTab("diff");
        break;
      case "retry_execution": {
        const err = retryExecutionTask(resolved.taskId);
        if (err) {
          useApp.getState().appendEvent({ role: "system", kind: "error", text: err });
        } else {
          setExecutionRecordDetailTab("diff");
        }
        break;
      }
      case "submit_proof":
        openOpsProofModal(resolved.taskId);
        setExecutionRecordDetailTab("proof");
        break;
      case "lane_b_proof": {
        const cadence = useApp.getState().opsCadence ?? useApp.getState().marketingProfile?.ops_cadence;
        const task = cadence?.tasks.find((t) => t.human_execution_ref?.item_id === resolved.itemId);
        if (task?.human_execution_ref) {
          openHumanTaskKitDrawer(task.human_execution_ref);
        } else {
          openLaneBProofModal(resolved.itemId);
        }
        setExecutionRecordDetailTab("proof");
        break;
      }
      case "start_next_cycle": {
        const err = startNextCmoCycle({
          mode: resolved.mode,
          thesisId: resolved.thesisId,
        });
        if (err) {
          useApp.getState().appendEvent({ role: "system", kind: "error", text: err });
        }
        break;
      }
      case "focus_war_room":
      case "focus_backstage":
        focusWarRoomAnchor(resolved.anchor);
        break;
      case "export":
        if (resolved.exportKind === "outreach") {
          const cadence = useApp.getState().opsCadence ?? useApp.getState().marketingProfile?.ops_cadence;
          const task = cadence?.tasks.find((t) => t.human_execution_ref?.export_kind === "outreach_csv");
          if (task?.human_execution_ref) {
            openHumanTaskKitDrawer(task.human_execution_ref);
          } else {
            focusWarRoomAnchor("lane-b-panel");
          }
        }
        break;
      case "week_review":
        focusWarRoomAnchor("cmo-ops-board");
        break;
      case "product_loop":
        if (resolved.siteLevel) {
          const req = laneDWorkspace?.requests.find((r) => r.id === resolved.requestId);
          if (req?.linked_ops_task_id) startOpsSystemTask(req.linked_ops_task_id);
        } else {
          const req = laneDWorkspace?.requests.find((r) => r.id === resolved.requestId);
          if (req?.fix_scope === "core_product") openProductIssueModal(resolved.requestId);
          else openProductRequestModal(resolved.requestId);
        }
        break;
      case "monetization":
        if (resolved.billingIssue) openMonetizationIssueModal(resolved.taskId);
        else openMonetizationTaskModal(resolved.taskId);
        break;
      case "operator_proof": {
        const cadence = useApp.getState().opsCadence ?? useApp.getState().marketingProfile?.ops_cadence;
        const task = cadence?.tasks.find(
          (t) => t.human_execution_ref?.item_id === resolved.touchId,
        );
        if (task?.human_execution_ref) {
          openHumanTaskKitDrawer(task.human_execution_ref);
          setExecutionRecordDetailTab("proof");
          break;
        }
        if (resolved.operator === "distribution") {
          openDistributionProofModal(resolved.touchId);
          setExecutionRecordDetailTab("proof");
        } else if (resolved.operator === "influencer") {
          if (resolved.deal) openInfluencerDealModal(resolved.touchId);
          else openInfluencerProofModal(resolved.touchId);
          setExecutionRecordDetailTab("proof");
        } else {
          openDelegateRubricModal(resolved.touchId);
          setExecutionRecordDetailTab("proof");
        }
        break;
      }
      default:
        break;
    }
  };
}
