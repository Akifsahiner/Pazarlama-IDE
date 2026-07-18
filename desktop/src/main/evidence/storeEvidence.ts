import { app } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function saveEvidenceScreenshot(
  projectId: string,
  runId: string,
  pngBase64: string,
): Promise<string> {
  const dir = path.join(app.getPath("userData"), "evidence", projectId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${runId}.png`);
  const data = pngBase64.includes(",") ? pngBase64.split(",")[1]! : pngBase64;
  await writeFile(filePath, Buffer.from(data, "base64"));
  return filePath;
}
