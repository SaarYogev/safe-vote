import { IdentityService } from './IdentityService';
import { SafeVoteApiClient } from './SafeVoteApiClient';
import { VoteHistoryItem, PollResultsResponse } from '../types';

export interface VoteHistoryFilterOptions {
  pollIds?: string[];
}

export class VoteHistoryService {
  constructor(
    private identityService: IdentityService,
    private apiClient: SafeVoteApiClient
  ) {}

  async getUserHistory(options: VoteHistoryFilterOptions = {}): Promise<VoteHistoryItem[]> {
    const signature = await this.identityService.getOrCreateVoterSignature();
    return this.apiClient.getUserVoteHistory(signature, options.pollIds);
  }

  async getClosedPollBreakdown(pollId: string): Promise<PollResultsResponse> {
    return this.apiClient.getPollResults(pollId);
  }
}
