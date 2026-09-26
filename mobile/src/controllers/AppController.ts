import { IdentityService, StorageProvider } from '../services/IdentityService';
import { SafeVoteApiClient, HttpTransport } from '../services/SafeVoteApiClient';
import { PollsFilterService, PollsFilterOptions, PartitionedPolls } from '../services/PollsFilterService';
import { VotingService, VoteReceipt } from '../services/VotingService';
import { VoteHistoryService, VoteHistoryFilterOptions } from '../services/VoteHistoryService';
import {
  PollDetailsResponse,
  PollResultsResponse,
  VoteResponse,
  VoteHistoryItem,
} from '../types';

export interface AppConfig {
  baseUrl: string;
  storage: StorageProvider;
  transport: HttpTransport;
}

export class AppController {
  public identityService: IdentityService;
  public apiClient: SafeVoteApiClient;
  public pollsFilterService: PollsFilterService;
  public votingService: VotingService;
  public voteHistoryService: VoteHistoryService;

  constructor(config: AppConfig) {
    this.identityService = new IdentityService(config.storage);
    this.apiClient = new SafeVoteApiClient(config.baseUrl, config.transport);
    this.pollsFilterService = new PollsFilterService();
    this.votingService = new VotingService(this.identityService, this.apiClient);
    this.voteHistoryService = new VoteHistoryService(this.identityService, this.apiClient);
  }

  async getVoterSignature(): Promise<string> {
    return this.identityService.getOrCreateVoterSignature();
  }

  async resetVoterIdentity(): Promise<void> {
    return this.identityService.resetIdentity();
  }

  async loadPolls(): Promise<PollDetailsResponse[]> {
    return this.apiClient.getPolls();
  }

  partitionPolls(polls: PollDetailsResponse[]): PartitionedPolls {
    return this.pollsFilterService.partitionByStatus(polls);
  }

  filterPolls(polls: PollDetailsResponse[], options: PollsFilterOptions): PollDetailsResponse[] {
    return this.pollsFilterService.filterAndSort(polls, options);
  }

  async loadPollDetails(pollId: string): Promise<PollDetailsResponse> {
    return this.apiClient.getPoll(pollId);
  }

  async getCurrentUserVote(pollId: string): Promise<VoteResponse | null> {
    return this.votingService.getCurrentVote(pollId);
  }

  async castVote(poll: PollDetailsResponse, choiceUuid: string): Promise<VoteReceipt> {
    return this.votingService.castVote(poll, choiceUuid);
  }

  async reCastVote(poll: PollDetailsResponse, newChoiceUuid: string): Promise<VoteReceipt> {
    return this.votingService.reCastVote(poll, newChoiceUuid);
  }

  async loadPollResults(pollId: string): Promise<PollResultsResponse> {
    return this.apiClient.getPollResults(pollId);
  }

  async loadVoteHistory(options: VoteHistoryFilterOptions = {}): Promise<VoteHistoryItem[]> {
    return this.voteHistoryService.getUserHistory(options);
  }
}
