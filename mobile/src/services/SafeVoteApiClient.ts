import {
  PollDetailsResponse,
  PollResultsResponse,
  VoteResponse,
  VoteHistoryItem,
} from '../types';

export interface HttpTransport {
  request<T>(method: string, url: string, body?: any): Promise<T>;
}

export class SafeVoteApiClient {
  constructor(
    private baseUrl: string,
    private transport: HttpTransport
  ) {}

  async getPolls(): Promise<PollDetailsResponse[]> {
    return this.transport.request<PollDetailsResponse[]>('GET', `${this.baseUrl}/polls`);
  }

  async getPoll(pollId: string): Promise<PollDetailsResponse> {
    return this.transport.request<PollDetailsResponse>('GET', `${this.baseUrl}/polls/${pollId}`);
  }

  async castVote(pollId: string, choiceUuid: string, signature: string): Promise<string> {
    return this.transport.request<string>('POST', `${this.baseUrl}/polls/${pollId}/votes`, {
      signature,
      choice_uuid: choiceUuid,
    });
  }

  async getPollResults(pollId: string): Promise<PollResultsResponse> {
    return this.transport.request<PollResultsResponse>(
      'GET',
      `${this.baseUrl}/polls/${pollId}/votes`
    );
  }

  async getUserVoteForPoll(pollId: string, signature: string): Promise<VoteResponse | null> {
    try {
      return await this.transport.request<VoteResponse>(
        'GET',
        `${this.baseUrl}/polls/${pollId}/votes/${signature}`
      );
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getUserVoteHistory(signature: string, pollIds?: string[]): Promise<VoteHistoryItem[]> {
    let url = `${this.baseUrl}/votes/${signature}`;
    if (pollIds && pollIds.length > 0) {
      const queryParams = pollIds.map((id) => `poll_id=${encodeURIComponent(id)}`).join('&');
      url = `${url}?${queryParams}`;
    }
    return this.transport.request<VoteHistoryItem[]>('GET', url);
  }
}
