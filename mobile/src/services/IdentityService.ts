import { VoteCreationPayload } from '../types';

export interface StorageProvider {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface BallotDetails {
  choiceUuid: string;
  pollUuid: string;
}

const STORAGE_KEY_VOTER_SIGNATURE = 'safe_vote_voter_signature';

export class IdentityService {
  constructor(private storage: StorageProvider) {}

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

  async createBallotPayload(details: BallotDetails): Promise<VoteCreationPayload> {
    const signature = await this.getOrCreateVoterSignature();
    return {
      signature,
      choice_uuid: details.choiceUuid,
    };
  }

  async resetIdentity(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEY_VOTER_SIGNATURE);
  }
}
