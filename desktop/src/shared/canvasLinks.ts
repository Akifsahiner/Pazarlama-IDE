import { WORK_SURFACES, type WorkSurface } from "./workSurfaces";

export type CanvasLinkAction =
  | { type: "surface"; surface: WorkSurface }
  | { type: "plan-task"; taskId: string }
  | { type: "plan-playbook"; playbookId: string }
  | { type: "external"; url: string };

export function parseCanvasLink(href: string): CanvasLinkAction | null {
  if (href.startsWith("surface://")) {
    const slug = href.replace("surface://", "").split(/[?#]/)[0];
    if (slug.startsWith("plan-playbook/")) {
      const playbookId = slug.replace("plan-playbook/", "");
      if (playbookId) return { type: "plan-playbook", playbookId };
    }
    if (WORK_SURFACES.includes(slug as WorkSurface)) return { type: "surface", surface: slug as WorkSurface };
    return null;
  }
  if (href.startsWith("plan-task://")) {
    const taskId = href.replace("plan-task://", "").split(/[?#]/)[0];
    if (taskId) return { type: "plan-task", taskId };
    return null;
  }
  if (href.startsWith("plan-playbook://")) {
    const playbookId = href.replace("plan-playbook://", "").split(/[?#]/)[0];
    if (playbookId) return { type: "plan-playbook", playbookId };
    return null;
  }
  if (/^https?:\/\//i.test(href)) return { type: "external", url: href };
  return null;
}
