import { TronSigner, type TronNetwork } from "tronlink-signer";

export interface ConnectResult {
  address: string;
  approvalUrl: string;
}

export interface SignTransactionResult {
  signedTransaction: any;
  approvalUrl: string;
}

export class TronWalletSigner {
  private signer: TronSigner;
  private connectedAddress: string | null = null;
  private started = false;

  constructor() {
    this.signer = new TronSigner();
  }

  async start(): Promise<number> {
    if (!this.started) {
      await this.signer.start();
      this.started = true;
    }
    return this.signer.getConfig().httpPort;
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  async connectWallet(options?: { address?: string; network?: TronNetwork }): Promise<ConnectResult> {
    await this.start();
    const { address } = await this.signer.connectWallet(options?.network);

    if (options?.address && address !== options.address) {
      this.connectedAddress = null;
      throw new Error(
        `Connected address ${address} does not match required address ${options.address}. Please switch account in TronLink and retry.`,
      );
    }

    this.connectedAddress = address;
    return { address, approvalUrl: "" };
  }

  async signTransaction(unsignedTx: unknown, network?: TronNetwork): Promise<SignTransactionResult> {
    await this.start();
    const { signedTransaction } = await this.signer.signTransaction(
      unsignedTx as Record<string, unknown>,
      network,
    );
    return { signedTransaction, approvalUrl: "" };
  }

  async shutdown(): Promise<void> {
    this.connectedAddress = null;
    if (this.started) {
      await this.signer.stop();
      this.started = false;
    }
  }
}
