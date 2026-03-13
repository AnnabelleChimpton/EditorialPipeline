import fs from "fs";
import pipelineConfig from "../pipeline.config";
import { getManifest } from "./manifest";

export const config = {
  get pipelineName() {
    const manifest = getManifest();
    return process.env.PIPELINE_NAME || manifest.name || pipelineConfig.pipelineName;
  },
  workspaceRoot: process.env.WORKSPACE_ROOT || pipelineConfig.workspaceRoot,
};

// Startup validation
if (!config.workspaceRoot) {
  throw new Error(
    "workspaceRoot is not configured. Set it in pipeline.config.ts or via the WORKSPACE_ROOT environment variable."
  );
}

if (!fs.existsSync(config.workspaceRoot)) {
  throw new Error(
    `workspaceRoot directory does not exist: ${config.workspaceRoot}\n` +
      "Check the path in pipeline.config.ts or the WORKSPACE_ROOT environment variable."
  );
}
