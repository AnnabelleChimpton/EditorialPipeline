import path from "path";
import { config } from "./config";

export const WORKSPACE_ROOT = config.workspaceRoot;
export const REFERENCE_DIR = path.join(WORKSPACE_ROOT, "REFERENCE");
