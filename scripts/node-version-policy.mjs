export const REQUIRED_NODE_VERSION = "24.22.1";

export function isSecureSupportedNodeVersion(version) {
  return version === REQUIRED_NODE_VERSION || version === `v${REQUIRED_NODE_VERSION}`;
}

export function assertSecureNodeVersion(version = process.version) {
  if (isSecureSupportedNodeVersion(version)) {
    return;
  }

  const error = new Error(
    `Unsupported Node.js runtime ${version}. Security policy requires Node.js ${REQUIRED_NODE_VERSION} exactly. ` +
      `Use nvm use to activate the repository-pinned runtime.`,
  );
  error.code = "ERR_UNSUPPORTED_NODE_VERSION";
  throw error;
}
