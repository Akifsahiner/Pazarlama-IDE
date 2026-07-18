import { AnimatePresence, motion } from "framer-motion";
import { pageFade } from "@renderer/design/animations";
import { useApp } from "@renderer/state/store";
import {
  isExecutionCanvasMode,
  normalizeCanvasMode,
  normalizeToWorkSurface,
} from "@shared/workSurfaces";
import { ShipPipelineBar } from "@renderer/features/workspace/ShipPipelineBar";
import { EmptyCanvas } from "./canvas/EmptyCanvas";
import { BrowserCanvas } from "./canvas/BrowserCanvas";
import { RunCanvas } from "./canvas/RunCanvas";
import { PreviewCanvas } from "./canvas/PreviewCanvas";
import { TaskGraphCanvas } from "./canvas/TaskGraphCanvas";
import { FilePreview } from "./FilePreview";
import { WorkSurfaceShell } from "./canvas/WorkSurfaceShell";
import { WorkSurfaceBody } from "./canvas/work/WorkSurfaceBody";

export function Canvas() {
  const mode = useApp((s) => normalizeCanvasMode(s.canvas.mode));
  const surface = normalizeToWorkSurface(mode);

  return (
    <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg">
      <ShipPipelineBar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={pageFade.initial}
          animate={pageFade.animate}
          exit={pageFade.exit}
          transition={pageFade.transition}
          className="h-full"
        >
          {mode === "empty" && <EmptyCanvas />}
          {isExecutionCanvasMode(mode) && mode === "browser" && <BrowserCanvas />}
          {isExecutionCanvasMode(mode) && mode === "run" && <RunCanvas />}
          {isExecutionCanvasMode(mode) && mode === "preview" && <PreviewCanvas />}
          {isExecutionCanvasMode(mode) && mode === "taskgraph" && <TaskGraphCanvas />}
          {mode === "file" && <FilePreview />}
          {surface && (
            <WorkSurfaceShell active={surface}>
              <WorkSurfaceBody surface={surface} />
            </WorkSurfaceShell>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
