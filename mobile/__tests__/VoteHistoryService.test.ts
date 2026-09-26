import { VoteHistoryService } from '../src/services/VoteHistoryService';
import { IdentityService, StorageProvider } from '../src/services/IdentityService';
import { SafeVoteApiClient, HttpTransport } from '../src/services/SafeVoteApiClient';
import { VoteHistoryItem, PollResultsResponse } from '../src/types';

class MemoryStorage implements StorageProvider {
  private data = new Map<string, string>();
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { this.data.set(key, value); }
  async removeItem(key: string) { this.data.delete(key); }
}

class HistoryMockTransport implements HttpTransport {
  public historyRecords: VoteHistoryItem[] = [];
  public resultsRecords = new Map<string, PollResultsResponse>();
  public queriedUrls: string[] = [];

  async request<T>(method: string, url: string): Promise<T> {
    this.queriedUrls.push(url);

    if (url.startsWith('http://localhost:8001/votes/')) {
      if (url.includes('poll_id=')) {
        const urlObj = new URL(url);
        const pollIds = urlObj.searchParams.getAll('poll_id');
        return this.historyRecords.filter((r) => pollIds.includes(r.poll_uuid)) as T;
      }
      return this.historyRecords as T;
    }

    if (url.includes('/votes') && method === 'GET') {
      const match = url.match(/\/polls\/([^/]+)\/votes/);
      if (match && this.resultsRecords.has(match[1])) {
        return this.resultsRecords.get(match[1]) as T;
      }
    }

    throw new Error(`Unhandled URL: ${url}`);
  }
}

describe('VoteHistoryService Seam', () => {
  let identityService: IdentityService;
  let transport: HistoryMockTransport;
  let apiClient: SafeVoteApiClient;
  let historyService: VoteHistoryService;

  const mockHistory: VoteHistoryItem[] = [
    {
      uuid: 'vote-1',
      signature: 'test-voter-sig',
      choice_uuid: 'choice-winner',
      poll_uuid: 'poll-closed-1',
      timestamp: '2026-02-10T14:30:00Z',
      poll_status: 'closed',
      is_winning_choice: true,
    },
    {
      uuid: 'vote-2',
      signature: 'test-voter-sig',
      choice_uuid: 'choice-loser',
      poll_uuid: 'poll-closed-2',
      timestamp: '2026-02-15T09:00:00Z',
      poll_status: 'closed',
      is_winning_choice: false,
    },
    {
      uuid: 'vote-3',
      signature: 'test-voter-sig',
      choice_uuid: 'choice-active',
      poll_uuid: 'poll-open-3',
      timestamp: '2026-03-01T18:00:00Z',
      poll_status: 'open',
      is_winning_choice: null,
    },
  ];

  beforeEach(async () => {
    const storage = new MemoryStorage();
    await storage.setItem('safe_vote_voter_signature', 'test-voter-sig');
    identityService = new IdentityService(storage);

    transport = new HistoryMockTransport();
    transport.historyRecords = [...mockHistory];
    transport.resultsRecords.set('poll-closed-1', {
      status: 'closed',
      winning_choice: 'choice-winner',
      vote_distribution: { 'choice-winner': 42, 'choice-other': 12 },
    });

    apiClient = new SafeVoteApiClient('http://localhost:8001', transport);
    historyService = new VoteHistoryService(identityService, apiClient);
  });

  describe('getUserHistory', () => {
    it('returns complete user vote history', async () => {
      const history = await historyService.getUserHistory();

      expect(history).toHaveLength(3);
      expect(history[0].poll_uuid).toBe('poll-closed-1');
      expect(history[0].is_winning_choice).toBe(true);
      expect(history[2].poll_status).toBe('open');
      expect(history[2].is_winning_choice).toBeNull();
    });

    it('filters vote history by single poll id', async () => {
      const filtered = await historyService.getUserHistory({ pollIds: ['poll-closed-2'] });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].poll_uuid).toBe('poll-closed-2');
      expect(filtered[0].is_winning_choice).toBe(false);
    });

    it('filters vote history by multiple poll ids', async () => {
      const filtered = await historyService.getUserHistory({
        pollIds: ['poll-closed-1', 'poll-open-3'],
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((item) => item.poll_uuid)).toEqual(['poll-closed-1', 'poll-open-3']);
    });
  });

  describe('getClosedPollBreakdown', () => {
    it('fetches full vote distribution and winning choice for closed poll', async () => {
      const breakdown = await historyService.getClosedPollBreakdown('poll-closed-1');

      expect(breakdown.winning_choice).toBe('choice-winner');
      expect(breakdown.vote_distribution['choice-winner']).toBe(42);
      expect(breakdown.status).toBe('closed');
    });
  });
});
