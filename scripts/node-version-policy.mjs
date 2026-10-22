const PATCHED_MINIMUMS = new Map([
  [22, [23, 4]],
  [24, [22, 1]],
  [26, [12, 1]],
]);

export const SUPPORTED_NODE_RANGES = ">=22.23.4 <23 || >=24.22.1 <25 || >=26.12.1 <27";
export const RECOMMENDED_NODE_VERSION = "24.22.1";

function parseNodeVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return undefined;
  }

  return match.slice(1).map(Number);
}

export function isSecureSupportedNodeVersion(version) {
  const parsed = parseNodeVersion(version);
  if (!parsed) {
    return false;
  }

  const [major, minor, patch] = parsed;
  const minimum = PATCHED_MINIMUMS.get(major);
  if (!minimum) {
    return false;
  }

  const [minimumMinor, minimumPatch] = minimum;
  return minor > minimumMinor || (minor === minimumMinor && patch >= minimumPatch);
}

export function assertSecureNodeVersion(version = process.version) {
  if (isSecureSupportedNodeVersion(version)) {
    return;
  }

  const error = new Error(
    `Unsupported Node.js runtime ${version}. Security policy requires ${SUPPORTED_NODE_RANGES}. ` +
      `Use Node.js ${RECOMMENDED_NODE_VERSION} LTS unless another patched supported line is required.`,
  );
  error.code = "ERR_UNSUPPORTED_NODE_VERSION";
  throw error;
}
