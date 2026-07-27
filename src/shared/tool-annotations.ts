// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

// All tools call out to the Azure DevOps REST API, which is state the server doesn't control.
const openWorldHint = true;

/** Read-only tools: list/get/query operations that never mutate Azure DevOps state. */
export const READ_ONLY_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint,
};

/** Write tools that only create new resources (no risk of overwriting or deleting existing data). */
export const WRITE_CREATE_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint,
};

/** Write tools that update/replace existing resources in place, safe to retry with the same input. */
export const WRITE_UPDATE_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint,
};

/** Write tools that can delete, unlink, or otherwise irreversibly remove existing data. */
export const WRITE_DESTRUCTIVE_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint,
};
