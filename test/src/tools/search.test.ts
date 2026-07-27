// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebApi } from "azure-devops-node-api";
import { configureSearchTools } from "../../../src/tools/search";

jest.mock("../../../src/index", () => ({ orgName: "test-org" }));

type TokenProviderMock = () => Promise<string>;
type ConnectionProviderMock = () => Promise<WebApi>;

interface GitApiMock {
  getItem: jest.Mock;
}

describe("configureSearchTools", () => {
  let server: McpServer;
  let tokenProvider: TokenProviderMock;
  let connectionProvider: ConnectionProviderMock;
  let userAgentProvider: () => string;
  let mockGitApi: GitApiMock;
  let mockConnection: { getGitApi: jest.Mock };

  beforeEach(() => {
    server = { registerTool: jest.fn() } as unknown as McpServer;
    tokenProvider = jest.fn().mockResolvedValue("fake-token") as unknown as TokenProviderMock;
    userAgentProvider = () => "Jest";

    mockGitApi = {
      getItem: jest.fn(),
    };

    mockConnection = {
      getGitApi: jest.fn().mockResolvedValue(mockGitApi),
    };

    connectionProvider = jest.fn().mockResolvedValue(mockConnection);

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("tool registration", () => {
    it("registers search tools on the server", () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);
      expect(server.registerTool as jest.Mock).toHaveBeenCalled();
    });
  });

  describe("search_code tool", () => {
    it("should call the code search API and combine results with git items", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_code");
      if (!call) throw new Error("search_code tool not registered");
      const [, config, handler] = call;

      expect(config.description).toContain("Search Azure DevOps Repositories");
      expect(config.inputSchema).toBeDefined();

      const searchResults = {
        results: [
          {
            project: { id: "proj-1" },
            repository: { id: "repo-1" },
            path: "/src/file.ts",
            versions: [{ changeId: "abc123" }],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(searchResults)),
      });

      mockGitApi.getItem.mockResolvedValue({ path: "/src/file.ts", content: "console.log('hi')" });

      const params = {
        searchText: "hello",
        includeFacets: false,
        skip: 0,
        top: 5,
      };

      const result = await handler(params);

      expect(global.fetch).toHaveBeenCalledWith("https://almsearch.dev.azure.com/test-org/_apis/search/codesearchresults?api-version=7.2-preview.1", expect.objectContaining({ method: "POST" }));
      expect(mockGitApi.getItem).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("console.log");
    });

    it("should handle API errors correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_code");
      if (!call) throw new Error("search_code tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const params = { searchText: "hello", includeFacets: false, skip: 0, top: 5 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching code: Azure DevOps Code Search API error: 500 Internal Server Error");
    });

    it("should handle unknown error type correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_code");
      if (!call) throw new Error("search_code tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockRejectedValue("string error");

      const params = { searchText: "hello", includeFacets: false, skip: 0, top: 5 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching code: Unknown error occurred");
    });
  });

  describe("search_wiki tool", () => {
    it("should call the wiki search API and return the expected result", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_wiki");
      if (!call) throw new Error("search_wiki tool not registered");
      const [, config, handler] = call;

      expect(config.description).toContain("Search Azure DevOps Wiki");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ results: [] })),
      });

      const params = { searchText: "hello", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(global.fetch).toHaveBeenCalledWith("https://almsearch.dev.azure.com/test-org/_apis/search/wikisearchresults?api-version=7.2-preview.1", expect.objectContaining({ method: "POST" }));
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(JSON.stringify({ results: [] }));
    });

    it("should handle API errors correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_wiki");
      if (!call) throw new Error("search_wiki tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const params = { searchText: "hello", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching wiki: Azure DevOps Wiki Search API error: 404 Not Found");
    });

    it("should handle unknown error type correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_wiki");
      if (!call) throw new Error("search_wiki tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockRejectedValue("string error");

      const params = { searchText: "hello", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching wiki: Unknown error occurred");
    });
  });

  describe("search_workitem tool", () => {
    it("should call the work item search API and return the expected result", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_workitem");
      if (!call) throw new Error("search_workitem tool not registered");
      const [, config, handler] = call;

      expect(config.description).toContain("Work Item search results");

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ results: [] })),
      });

      const params = { searchText: "bug", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(global.fetch).toHaveBeenCalledWith("https://almsearch.dev.azure.com/test-org/_apis/search/workitemsearchresults?api-version=7.2-preview.1", expect.objectContaining({ method: "POST" }));
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(JSON.stringify({ results: [] }));
    });

    it("should handle API errors correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_workitem");
      if (!call) throw new Error("search_workitem tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const params = { searchText: "bug", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching work items: Azure DevOps Work Item Search API error: 500 Internal Server Error");
    });

    it("should handle unknown error type correctly", async () => {
      configureSearchTools(server, tokenProvider, connectionProvider, userAgentProvider);

      const call = (server.registerTool as jest.Mock).mock.calls.find(([toolName]) => toolName === "search_workitem");
      if (!call) throw new Error("search_workitem tool not registered");
      const [, , handler] = call;

      (global.fetch as jest.Mock).mockRejectedValue("string error");

      const params = { searchText: "bug", includeFacets: false, skip: 0, top: 10 };
      const result = await handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error searching work items: Unknown error occurred");
    });
  });
});
