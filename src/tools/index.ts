import { accountTools } from "./accounts";
import { builtInVariablesTools } from "./built-in-variables";
import { clientTools } from "./clients";
import { containerTools } from "./containers";
import { destinationTools } from "./destinations";
import { environmentTools } from "./environments";
import { folderTools } from "./folders";
import { gtagConfigTools } from "./gtag-config";
import { tagTools } from "./tags";
import { templateTools } from "./templates";
import { transformationTools } from "./transformations";
import { triggerTools } from "./triggers";
import { userPermissionTools } from "./user-permissions";
import { variableTools } from "./variables";
import { versionHeadersTools } from "./version-headers";
import { versionTools } from "./versions";
import { workspaceTools } from "./workspaces";
import { zoneTools } from "./zones";
import { search, fetch } from "./deepResearch";

const allTools = [
  ...accountTools,
  ...containerTools,
  ...destinationTools,
  ...environmentTools,
  ...versionHeadersTools,
  ...versionTools,
  ...workspaceTools,
  ...builtInVariablesTools,
  ...clientTools,
  ...folderTools,
  ...gtagConfigTools,
  ...templateTools,
  ...tagTools,
  ...transformationTools,
  ...triggerTools,
  ...variableTools,
  ...zoneTools,
  ...userPermissionTools,
  search,
  fetch,
];

const allowedToolNames = ["get", "list", "search", "fetch"];

export const tools = allTools.filter((tool) =>
  allowedToolNames.includes(tool.name),
);
