import { VoteCreationPayload } from '../types';
import { HardwareSecurityProvider } from './HardwareSecurityProvider';

export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface BallotDetails {
  choiceUuid: string;
  pollUuid: string;
}

export interface BallotSignDetails {
  pollUuid: string;
  choiceUuid: string;
  timestamp: number;
  nonce: string;
}

export interface SignedBallotPayload {
  choice_uuid: string;
  signature: string;
  public_key: string;
  timestamp: number;
  nonce: string;
}

const STORAGE_KEY_VOTER_SIGNATURE = 'safe_vote_voter_signature';
const STORAGE_KEY_HARDWARE_PUBLIC_KEY = 'safe_vote_hardware_public_key';
const HARDWARE_KEY_TAG = 'safe_vote_enclave_key';

export class IdentityService {
  constructor(
    private storage: StorageProvider,
    private hardwareProvider?: HardwareSecurityProvider
  ) {}

  private generateSignature(): string {
    const timestamp = Date.now().toString(36);
    const randomEntropy = Math.random().toString(36).substring(2, 10);
    return `sig_${timestamp}_${randomEntropy}`;
  }

  async getOrCreateVoterSignature(): Promise<string> {
    const existing = await this.storage.getItem(STORAGE_KEY_VOTER_SIGNATURE);
    if (existing) {
      return existing;
    }

    const newSignature = this.generateSignature();
    await this.storage.setItem(STORAGE_KEY_VOTER_SIGNATURE, newSignature);
    return newSignature;
  }

  async getOrCreateHardwarePublicKey(): Promise<string> {
    const cached = await this.storage.getItem(STORAGE_KEY_HARDWARE_PUBLIC_KEY);
    if (cached) {
      return cached;
    }

    if (!this.hardwareProvider) {
      const fallbackSignature = await this.getOrCreateVoterSignature();
      return fallbackSignature;
    }

    const hasBiometrics = await this.hardwareProvider.isBiometricsSupported();
    if (!hasBiometrics) {
      const fallbackSignature = await this.getOrCreateVoterSignature();
      return fallbackSignature;
    }

    const result = await this.hardwareProvider.generateHardwareKeyPair({
      keyTag: HARDWARE_KEY_TAG,
      accessControl: {
        biometryCurrentSetOnly: true,
        disableDeviceFallback: true,
      },
    });

    await this.storage.setItem(STORAGE_KEY_HARDWARE_PUBLIC_KEY, result.publicKey);
    return result.publicKey;
  }

  async signVoteBallot(details: BallotSignDetails): Promise<SignedBallotPayload> {
    const publicKey = await this.getOrCreateHardwarePublicKey();
    const canonicalPayload = `{"choice_id":"${details.choiceUuid}","nonce":"${details.nonce}","poll_id":"${details.pollUuid}","timestamp":${details.timestamp}}`;

    let signature: string;
    if (this.hardwareProvider) {
      signature = await this.hardwareProvider.signWithBiometrics(HARDWARE_KEY_TAG, canonicalPayload);
    } else {
      signature = await this.getOrCreateVoterSignature();
    }

    return {
      choice_uuid: details.choiceUuid,
      signature,
      public_key: publicKey,
      timestamp: details.timestamp,
      nonce: details.nonce,
    };
  }

  async createBallotPayload(details: BallotDetails): Promise<VoteCreationPayload> {
    const signature = await this.getOrCreateVoterSignature();
    return {
      signature,
      choice_uuid: details.choiceUuid,
    };
  }

  async resetIdentity(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEY_VOTER_SIGNATURE);
    await this.storage.removeItem(STORAGE_KEY_HARDWARE_PUBLIC_KEY);
  }
}
