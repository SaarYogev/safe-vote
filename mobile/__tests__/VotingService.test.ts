import { VotingService } from '../src/services/VotingService';
import { IdentityService, StorageProvider } from '../src/services/IdentityService';
import { SafeVoteApiClient, HttpTransport } from '../src/services/SafeVoteApiClient';
import { PollDetailsResponse, VoteResponse } from '../src/types';

class MemoryStorage implements StorageProvider {
  private data = new Map<string, string>();
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { this.data.set(key, value); }
  async removeItem(key: string) { this.data.delete(key); }
}

class FakeHttpTransport implements HttpTransport {
  public castCalls: Array<{ url: string; body: any }> = [];
  public getVotesCalls: Array<string> = [];

  async request<T>(method: string, url: string, body?: any): Promise<T> {
    if (method === 'POST') {
      this.castCalls.push({ url, body });
      return `Casting a vote with the signature ${body.signature}, for choice ${body.choice_uuid}` as T;
    }
    if (method === 'GET' && url.includes('/votes/')) {
      this.getVotesCalls.push(url);
      const lastCall = this.castCalls[this.castCalls.length - 1];
      if (lastCall) {
        return {
          uuid: 'vote-uuid-gen',
          signature: lastCall.body.signature,
          choice_uuid: lastCall.body.choice_uuid,
          poll_uuid: 'poll-open-1',
          timestamp: new Date().toISOString(),
        } as T;
      }
      const err: any = new Error('Not Found');
      err.status = 404;
      throw err;
    }
    throw new Error(`Unhandled URL in fake transport: ${method} ${url}`);
  }
}

describe('VotingService Seam', () => {
  let identityService: IdentityService;
  let apiClient: SafeVoteApiClient;
  let fakeTransport: FakeHttpTransport;
  let votingService: VotingService;

  const openPoll: PollDetailsResponse = {
    uuid: 'poll-open-1',
    name: 'Community Initiative 2026',
    start_date: '2026-01-01',
    close_date: '2099-12-31',
    status: 'open',
    choices: [
      { uuid: 'choice-park', name: 'Build Park', poll_uuid: 'poll-open-1' },
      { uuid: 'choice-library', name: 'Expand Library', poll_uuid: 'poll-open-1' },
    ],
  };

  const closedPoll: PollDetailsResponse = {
    uuid: 'poll-closed-2',
    name: 'Archived Referendum',
    start_date: '2020-01-01',
    close_date: '2020-02-01',
    status: 'closed',
    choices: [
      { uuid: 'choice-yes', name: 'Yes', poll_uuid: 'poll-closed-2' },
      { uuid: 'choice-no', name: 'No', poll_uuid: 'poll-closed-2' },
    ],
  };

  beforeEach(() => {
    const storage = new MemoryStorage();
    identityService = new IdentityService(storage);
    fakeTransport = new FakeHttpTransport();
    apiClient = new SafeVoteApiClient('http://localhost:8001', fakeTransport);
    votingService = new VotingService(identityService, apiClient);
  });

  describe('castVote', () => {
    it('casts a vote on an open poll successfully with voter signature', async () => {
      const receipt = await votingService.castVote(openPoll, 'choice-park');

      expect(receipt.pollUuid).toBe('poll-open-1');
      expect(receipt.choiceUuid).toBe('choice-park');
      expect(receipt.signature).toBeDefined();

      expect(fakeTransport.castCalls).toHaveLength(1);
      expect(fakeTransport.castCalls[0].body.choice_uuid).toBe('choice-park');
    });

    it('rejects voting if poll status is closed', async () => {
      await expect(
        votingService.castVote(closedPoll, 'choice-yes')
      ).rejects.toThrow('Cannot cast vote: poll is closed');

      expect(fakeTransport.castCalls).toHaveLength(0);
    });

    it('rejects voting if choice does not belong to the poll', async () => {
      await expect(
        votingService.castVote(openPoll, 'choice-non-existent')
      ).rejects.toThrow('Invalid choice for poll');

      expect(fakeTransport.castCalls).toHaveLength(0);
    });
  });

  describe('reCastVote', () => {
    it('allows changing/re-casting a vote on an open poll', async () => {
      await votingService.castVote(openPoll, 'choice-park');
      const receipt2 = await votingService.reCastVote(openPoll, 'choice-library');

      expect(receipt2.choiceUuid).toBe('choice-library');
      expect(fakeTransport.castCalls).toHaveLength(2);
      expect(fakeTransport.castCalls[1].body.choice_uuid).toBe('choice-library');
    });

    it('refuses to re-cast vote on a poll that has closed', async () => {
      await expect(
        votingService.reCastVote(closedPoll, 'choice-no')
      ).rejects.toThrow('Cannot cast vote: poll is closed');
    });
  });

  describe('getCurrentVote', () => {
    it('retrieves the active vote for a poll', async () => {
      await votingService.castVote(openPoll, 'choice-park');

      const currentVote = await votingService.getCurrentVote(openPoll.uuid);
      expect(currentVote).not.toBeNull();
      expect(currentVote?.choice_uuid).toBe('choice-park');
    });
  });
});
