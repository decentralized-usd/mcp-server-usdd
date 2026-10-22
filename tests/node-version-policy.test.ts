import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertSecureNodeVersion,
  isSecureSupportedNodeVersion,
  RECOMMENDED_NODE_VERSION,
  SUPPORTED_NODE_RANGES,
} from "../scripts/node-version-policy.mjs";

describe("Node.js security release policy", () => {
  it.each(["v22.23.4", "22.24.0", "v24.22.1", "24.23.0", "v26.12.1", "26.13.0"])(
    "accepts patched supported version %s",
    (version) => {
      expect(isSecureSupportedNodeVersion(version)).toBe(true);
    },
  );

  it.each(["v22.23.3", "v24.22.0", "v26.12.0"])(
    "rejects vulnerable boundary version %s",
    (version) => {
      expect(isSecureSupportedNodeVersion(version)).toBe(false);
    },
  );

  it.each(["v20.20.0", "v23.11.1", "v25.4.0", "v27.0.0", "not-a-version", "v24.22"])(
    "rejects EOL, unreviewed, or malformed version %s",
    (version) => {
      expect(isSecureSupportedNodeVersion(version)).toBe(false);
    },
  );

  it("reports the patched minimums when rejecting a runtime", () => {
    expect(() => assertSecureNodeVersion("v24.22.0")).toThrow(
      /22\.23\.4.*24\.22\.1.*26\.12\.1/,
    );
  });

  it("keeps package metadata and the development pin aligned with the policy", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const nvmVersion = readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim();

    expect(packageJson.engines.node).toBe(SUPPORTED_NODE_RANGES);
    expect(nvmVersion).toBe(RECOMMENDED_NODE_VERSION);
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
