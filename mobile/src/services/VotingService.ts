import { IdentityService } from './IdentityService';
import { SafeVoteApiClient } from './SafeVoteApiClient';
import { PollDetailsResponse, VoteResponse } from '../types';

export interface VoteReceipt {
  pollUuid: string;
  choiceUuid: string;
  signature: string;
  timestamp: string;
}

export class VotingService {
  constructor(
    private identityService: IdentityService,
    private apiClient: SafeVoteApiClient
  ) {}

  async castVote(poll: PollDetailsResponse, choiceUuid: string): Promise<VoteReceipt> {
    if (poll.status === 'closed') {
      throw new Error('Cannot cast vote: poll is closed');
    }

    const choiceExists = poll.choices?.some((c) => c.uuid === choiceUuid) ?? false;
    if (!choiceExists) {
      throw new Error('Invalid choice for poll');
    }

    const signature = await this.identityService.getOrCreateVoterSignature();
    await this.apiClient.castVote(poll.uuid, choiceUuid, signature);

    return {
      pollUuid: poll.uuid,
      choiceUuid,
      signature,
      timestamp: new Date().toISOString(),
    };
  }

  async reCastVote(poll: PollDetailsResponse, newChoiceUuid: string): Promise<VoteReceipt> {
    return this.castVote(poll, newChoiceUuid);
  }

  async getCurrentVote(pollId: string): Promise<VoteResponse | null> {
    const signature = await this.identityService.getOrCreateVoterSignature();
    return this.apiClient.getUserVoteForPoll(pollId, signature);
  }
}
