import { SafeVoteApiClient, HttpTransport } from '../src/services/SafeVoteApiClient';
import {
  PollDetailsResponse,
  PollResultsResponse,
  VoteResponse,
  VoteHistoryItem,
} from '../src/types';

class MockHttpTransport implements HttpTransport {
  public requests: Array<{
    method: string;
    url: string;
    body?: any;
  }> = [];

  public mockResponses = new Map<string, { status: number; data: any }>();

  setMockResponse(key: string, status: number, data: any) {
    this.mockResponses.set(key, { status, data });
  }

  async request<T>(method: string, url: string, body?: any): Promise<T> {
    this.requests.push({ method, url, body });
    const key = `${method.toUpperCase()} ${url}`;
    const mock = this.mockResponses.get(key);

    if (!mock) {
      throw new Error(`Unhandled mock request: ${key}`);
    }

    if (mock.status >= 400) {
      const error: any = new Error(`HTTP Error ${mock.status}: ${JSON.stringify(mock.data)}`);
      error.status = mock.status;
      error.data = mock.data;
      throw error;
    }

    return mock.data as T;
  }
}

describe('SafeVoteApiClient Seam', () => {
  let transport: MockHttpTransport;
  let client: SafeVoteApiClient;
  const baseUrl = 'http://localhost:8001';

  beforeEach(() => {
    transport = new MockHttpTransport();
    client = new SafeVoteApiClient(baseUrl, transport);
  });

  describe('getPolls', () => {
    it('fetches all polls from GET /polls', async () => {
      const samplePolls: PollDetailsResponse[] = [
        {
          uuid: 'poll-1',
          name: 'Presidential Election',
          start_date: '2026-01-01',
          close_date: '2099-12-31',
          status: 'open',
          choices: [
            { uuid: 'c1', name: 'Alice', poll_uuid: 'poll-1' },
            { uuid: 'c2', name: 'Bob', poll_uuid: 'poll-1' },
          ],
        },
      ];

      transport.setMockResponse('GET http://localhost:8001/polls', 200, samplePolls);

      const result = await client.getPolls();
      expect(result).toEqual(samplePolls);
      expect(transport.requests).toContainEqual({
        method: 'GET',
        url: 'http://localhost:8001/polls',
        body: undefined,
      });
    });
  });

  describe('getPoll', () => {
    it('fetches a single poll by id from GET /polls/:id', async () => {
      const samplePoll: PollDetailsResponse = {
        uuid: 'poll-42',
        name: 'Single Poll',
        start_date: '2026-01-01',
        close_date: '2026-06-01',
        status: 'closed',
        choices: [{ uuid: 'c1', name: 'Choice 1', poll_uuid: 'poll-42' }],
      };

      transport.setMockResponse('GET http://localhost:8001/polls/poll-42', 200, samplePoll);

      const result = await client.getPoll('poll-42');
      expect(result).toEqual(samplePoll);
    });

    it('throws when poll is not found (404)', async () => {
      transport.setMockResponse('GET http://localhost:8001/polls/non-existent', 404, 'Not Found');

      await expect(client.getPoll('non-existent')).rejects.toThrow('HTTP Error 404');
    });
  });

  describe('castVote', () => {
    it('submits vote payload to POST /polls/:id/votes', async () => {
      transport.setMockResponse('POST http://localhost:8001/polls/poll-1/votes', 200, 'Vote recorded');

      const response = await client.castVote('poll-1', 'choice-1', 'sig-voter-123');

      expect(response).toBe('Vote recorded');
      expect(transport.requests).toContainEqual({
        method: 'POST',
        url: 'http://localhost:8001/polls/poll-1/votes',
        body: {
          signature: 'sig-voter-123',
          choice_uuid: 'choice-1',
        },
      });
    });

    it('rejects vote when poll is closed (403)', async () => {
      transport.setMockResponse(
        'POST http://localhost:8001/polls/poll-closed/votes',
        403,
        'Poll is closed. Votes are no longer accepted.'
      );

      await expect(
        client.castVote('poll-closed', 'choice-1', 'sig-voter-123')
      ).rejects.toThrow('HTTP Error 403');
    });
  });

  describe('getPollResults', () => {
    it('fetches results from GET /polls/:id/votes', async () => {
      const sampleResults: PollResultsResponse = {
        status: 'closed',
        winning_choice: 'choice-1',
        vote_distribution: {
          'choice-1': 10,
          'choice-2': 3,
        },
      };

      transport.setMockResponse('GET http://localhost:8001/polls/poll-1/votes', 200, sampleResults);

      const results = await client.getPollResults('poll-1');
      expect(results).toEqual(sampleResults);
    });
  });

  describe('getUserVoteForPoll', () => {
    it('fetches voter latest ballot from GET /polls/:id/votes/:signature', async () => {
      const sampleVote: VoteResponse = {
        uuid: 'vote-uuid-1',
        signature: 'sig-voter-123',
        choice_uuid: 'choice-1',
        poll_uuid: 'poll-1',
        timestamp: '2026-03-01 12:00:00',
      };

      transport.setMockResponse(
        'GET http://localhost:8001/polls/poll-1/votes/sig-voter-123',
        200,
        sampleVote
      );

      const vote = await client.getUserVoteForPoll('poll-1', 'sig-voter-123');
      expect(vote).toEqual(sampleVote);
    });

    it('returns null when voter has not voted in the poll (404)', async () => {
      transport.setMockResponse(
        'GET http://localhost:8001/polls/poll-1/votes/no-vote-sig',
        404,
        'Not Found'
      );

      const vote = await client.getUserVoteForPoll('poll-1', 'no-vote-sig');
      expect(vote).toBeNull();
    });
  });

  describe('getUserVoteHistory', () => {
    it('fetches all vote history from GET /votes/:signature', async () => {
      const history: VoteHistoryItem[] = [
        {
          uuid: 'v1',
          signature: 'sig-123',
          choice_uuid: 'c1',
          poll_uuid: 'p1',
          timestamp: '2026-03-01 10:00:00',
          poll_status: 'open',
          is_winning_choice: null,
        },
      ];

      transport.setMockResponse('GET http://localhost:8001/votes/sig-123', 200, history);

      const result = await client.getUserVoteHistory('sig-123');
      expect(result).toEqual(history);
    });

    it('appends poll_id query parameters when filtering by poll(s)', async () => {
      const history: VoteHistoryItem[] = [];

      transport.setMockResponse(
        'GET http://localhost:8001/votes/sig-123?poll_id=p1&poll_id=p2',
        200,
        history
      );

      const result = await client.getUserVoteHistory('sig-123', ['p1', 'p2']);
      expect(result).toEqual(history);
      expect(transport.requests).toContainEqual({
        method: 'GET',
        url: 'http://localhost:8001/votes/sig-123?poll_id=p1&poll_id=p2',
        body: undefined,
      });
    });
  });
});
