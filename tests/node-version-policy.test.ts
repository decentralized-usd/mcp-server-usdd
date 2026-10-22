import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertSecureNodeVersion,
  isSecureSupportedNodeVersion,
  REQUIRED_NODE_VERSION,
} from "../scripts/node-version-policy.mjs";

describe("Node.js security release policy", () => {
  it.each(["v24.22.1", "24.22.1"])(
    "accepts the pinned runtime %s",
    (version) => {
      expect(isSecureSupportedNodeVersion(version)).toBe(true);
    },
  );

  it.each([
    "v22.23.4",
    "v24.22.0",
    "v24.22.2",
    "v24.23.0",
    "v26.12.1",
    "v20.20.0",
    "v23.11.1",
    "v25.4.0",
    "v27.0.0",
    "not-a-version",
    "v24.22",
  ])(
    "rejects every unpinned or malformed version %s",
    (version) => {
      expect(isSecureSupportedNodeVersion(version)).toBe(false);
    },
  );

  it("reports the required exact version when rejecting a runtime", () => {
    expect(() => assertSecureNodeVersion("v24.22.2")).toThrow(/requires Node\.js 24\.22\.1 exactly/);
  });

  it("keeps package metadata and the development pin aligned with the policy", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const nvmVersion = readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim();

    expect(packageJson.engines.node).toBe(REQUIRED_NODE_VERSION);
    expect(nvmVersion).toBe(REQUIRED_NODE_VERSION);
  });

  it("loads the runtime guard before the published server entrypoint", () => {
    const cliSource = readFileSync(new URL("../bin/cli.js", import.meta.url), "utf8");
    const guardPosition = cliSource.indexOf('import "../scripts/check-node-version.mjs";');
    const serverPosition = cliSource.indexOf('import "../build/index.js";');

    expect(guardPosition).toBeGreaterThan(-1);
    expect(serverPosition).toBeGreaterThan(guardPosition);
  });

  it.each([
    ["../src/index.ts", 'import "../scripts/check-node-version.mjs";'],
    ["../src/server/http-server.ts", 'import "../../scripts/check-node-version.mjs";'],
    ["../src/server/server.ts", 'import "../../scripts/check-node-version.mjs";'],
  ])("loads the runtime guard first in %s", (path, guardImport) => {
    const entrypoint = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(entrypoint.startsWith(`${guardImport}\n`)).toBe(true);
  });
});
