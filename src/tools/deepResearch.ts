import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createErrorResponse, getTagManagerClient, log } from "../utils/index.js";

// Search containers by name or description within a specified account
export const search = (server: McpServer): void => {
  server.tool(
    "search",
    "Search GTM containers by name or description within an account",
    {
      accountId: z
        .string()
        .describe("Account ID containing the containers to search."),
      query: z.string().describe("Search query for the container name"),
    },
    async ({ accountId, query }): Promise<CallToolResult> => {
      log(`Running tool: search for account ${accountId} query '${query}'`);
      try {
        const tagmanager = await getTagManagerClient([
          "https://www.googleapis.com/auth/tagmanager.readonly",
        ]);
        const response = await tagmanager.accounts.containers.list({
          parent: `accounts/${accountId}`,
        });
        const containers = response.data.container || [];
        const q = query.toLowerCase();
        const results = containers
          .filter(
            (c) =>
              (c.name && c.name.toLowerCase().includes(q)) ||
              (c.description && c.description.toLowerCase().includes(q)),
          )
          .map((c) => ({
            id: `${accountId}/${c.containerId}`,
            title: c.name || "",
            text: c.description || "",
            url: c.tagManagerUrl || null,
          }));
        return {
          content: [
            { type: "text", text: JSON.stringify({ results }, null, 2) },
          ],
        };
      } catch (error) {
        return createErrorResponse(
          `Error searching containers in account ${accountId}`,
          error,
        );
      }
    },
  );
};

// Fetch a container's metadata by the combined id "accountId/containerId"
export const fetch = (server: McpServer): void => {
  server.tool(
    "fetch",
    "Fetch GTM container metadata by ID",
    {
      id: z.string().describe("ID in the form accountId/containerId"),
    },
    async ({ id }): Promise<CallToolResult> => {
      log(`Running tool: fetch for container ${id}`);
      try {
        const [accountId, containerId] = id.split("/");
        if (!accountId || !containerId) {
          throw new Error("Invalid ID format");
        }
        const tagmanager = await getTagManagerClient([
          "https://www.googleapis.com/auth/tagmanager.readonly",
        ]);
        const response = await tagmanager.accounts.containers.get({
          path: `accounts/${accountId}/containers/${containerId}`,
        });
        const c = response.data;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  id,
                  title: c.name || "",
                  text: c.description || "",
                  url: c.tagManagerUrl || null,
                  metadata: c,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return createErrorResponse(`Error fetching container ${id}`, error);
      }
    },
  );
};
