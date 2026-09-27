import { AppController } from '../src/controllers/AppController';
import { StorageProvider } from '../src/services/IdentityService';
import { HttpTransport } from '../src/services/SafeVoteApiClient';
import { PollsListScreenModel } from '../src/screens/PollsListScreen';
import { PollDetailScreenModel } from '../src/screens/PollDetailScreen';
import { VoteHistoryScreenModel } from '../src/screens/VoteHistoryScreen';
import { SettingsScreenModel } from '../src/screens/SettingsScreen';
import {
  PollDetailsResponse,
  PollResultsResponse,
  VoteResponse,
  VoteHistoryItem,
} from '../src/types';

class TestStorage implements StorageProvider {
  private memory = new Map<string, string>();
  async getItem(key: string) { return this.memory.get(key) ?? null; }
  async setItem(key: string, value: string) { this.memory.set(key, value); }
  async removeItem(key: string) { this.memory.delete(key); }
}

class TestTransport implements HttpTransport {
  public polls: PollDetailsResponse[] = [];
  public votes = new Map<string, Array<{ signature: string; choiceUuid: string }>>();
  public results = new Map<string, PollResultsResponse>();

  async request<T>(method: string, url: string, body?: any): Promise<T> {
    if (method === 'GET' && url.endsWith('/polls')) {
      return this.polls as T;
    }

    const singlePollMatch = url.match(/\/polls\/([^/]+)$/);
    if (method === 'GET' && singlePollMatch) {
      const poll = this.polls.find((p) => p.uuid === singlePollMatch[1]);
      if (!poll) throw { status: 404, message: 'Poll not found' };
      return poll as T;
    }

    const castVoteMatch = url.match(/\/polls\/([^/]+)\/votes$/);
    if (method === 'POST' && castVoteMatch) {
      const pollId = castVoteMatch[1];
      const poll = this.polls.find((p) => p.uuid === pollId);
      if (poll?.status === 'closed') throw { status: 403, message: 'Poll is closed' };
      
      const pollVotes = this.votes.get(pollId) || [];
      pollVotes.push({ signature: body.signature, choiceUuid: body.choice_uuid });
      this.votes.set(pollId, pollVotes);
      return 'Vote cast successfully' as T;
    }

    const pollResultsMatch = url.match(/\/polls\/([^/]+)\/votes$/);
    if (method === 'GET' && pollResultsMatch) {
      const pollId = pollResultsMatch[1];
      const res = this.results.get(pollId);
      if (!res) throw { status: 404, message: 'Results not found' };
      return res as T;
    }

    const userVoteMatch = url.match(/\/polls\/([^/]+)\/votes\/([^/]+)$/);
    if (method === 'GET' && userVoteMatch) {
      const [_, pollId, signature] = userVoteMatch;
      const pollVotes = this.votes.get(pollId) || [];
      const userBallot = [...pollVotes].reverse().find((v) => v.signature === signature);
      if (!userBallot) throw { status: 404, message: 'No vote found' };
      return {
        uuid: 'vote-uuid-' + userBallot.choiceUuid,
        signature,
        choice_uuid: userBallot.choiceUuid,
        poll_uuid: pollId,
        timestamp: new Date().toISOString(),
      } as T;
    }

    const historyMatch = url.match(/\/votes\/([^/?]+)/);
    if (method === 'GET' && historyMatch) {
      const signature = historyMatch[1];
      const urlObj = new URL(url);
      const filterPollIds = urlObj.searchParams.getAll('poll_id');

      const historyItems: VoteHistoryItem[] = [];
      for (const [pollId, ballots] of this.votes.entries()) {
        if (filterPollIds.length > 0 && !filterPollIds.includes(pollId)) continue;
        const poll = this.polls.find((p) => p.uuid === pollId);
        const userBallot = [...ballots].reverse().find((b) => b.signature === signature);
        if (userBallot && poll) {
          const res = this.results.get(pollId);
          historyItems.push({
            uuid: 'hist-' + pollId,
            signature,
            choice_uuid: userBallot.choiceUuid,
            poll_uuid: pollId,
            timestamp: new Date().toISOString(),
            poll_status: poll.status,
            is_winning_choice: poll.status === 'closed' ? res?.winning_choice === userBallot.choiceUuid : null,
          });
        }
      }
      return historyItems as T;
    }

    throw new Error(`Unhandled test request: ${method} ${url}`);
  }
}

describe('End-to-End User Flow Workflow Test', () => {
  let transport: TestTransport;
  let controller: AppController;

  const mockOpenPoll: PollDetailsResponse = {
    uuid: 'poll-open-city',
    name: 'City Council Initiative',
    start_date: '2026-01-01T00:00:00Z',
    close_date: '2099-12-31T23:59:59Z',
    status: 'open',
    choices: [
      { uuid: 'opt-transit', name: 'Rapid Transit Expansion', poll_uuid: 'poll-open-city' },
      { uuid: 'opt-housing', name: 'Affordable Housing Program', poll_uuid: 'poll-open-city' },
    ],
  };

  const mockClosedPoll: PollDetailsResponse = {
    uuid: 'poll-closed-2025',
    name: '2025 Annual Budget Ballot',
    start_date: '2025-01-01T00:00:00Z',
    close_date: '2025-12-31T23:59:59Z',
    status: 'closed',
    choices: [
      { uuid: 'opt-infra', name: 'Infrastructure Investment', poll_uuid: 'poll-closed-2025' },
      { uuid: 'opt-edu', name: 'Education Endowment', poll_uuid: 'poll-closed-2025' },
    ],
  };

  beforeEach(() => {
    transport = new TestTransport();
    transport.polls = [mockOpenPoll, mockClosedPoll];
    transport.results.set('poll-closed-2025', {
      status: 'closed',
      winning_choice: 'opt-edu',
      vote_distribution: {
        'opt-infra': 120,
        'opt-edu': 245,
      },
    });

    const storage = new TestStorage();
    controller = new AppController({
      baseUrl: 'http://localhost:8001',
      storage,
      transport,
    });
  });

  it('manages the entire voting lifecycle from poll discovery to results verification', async () => {
    const pollsListScreen = new PollsListScreenModel(controller);
    await pollsListScreen.loadPolls();

    expect(pollsListScreen.getState().filteredPolls).toHaveLength(1);
    expect(pollsListScreen.getState().filteredPolls[0].uuid).toBe('poll-open-city');

    pollsListScreen.setTab('closed');
    expect(pollsListScreen.getState().filteredPolls).toHaveLength(1);
    expect(pollsListScreen.getState().filteredPolls[0].uuid).toBe('poll-closed-2025');

    const detailScreen = new PollDetailScreenModel(controller, 'poll-open-city');
    await detailScreen.load();
    expect(detailScreen.getState().currentVote).toBeNull();

    detailScreen.selectChoice('opt-transit');
    const firstReceipt = await detailScreen.submitVote();
    expect(firstReceipt).not.toBeNull();
    expect(detailScreen.getState().successMessage).toBe('Vote cast successfully!');
    expect(detailScreen.getState().currentVote?.choice_uuid).toBe('opt-transit');

    detailScreen.selectChoice('opt-housing');
    const secondReceipt = await detailScreen.submitVote();
    expect(secondReceipt).not.toBeNull();
    expect(detailScreen.getState().successMessage).toBe('Vote updated successfully!');
    expect(detailScreen.getState().currentVote?.choice_uuid).toBe('opt-housing');

    const historyScreen = new VoteHistoryScreenModel(controller);
    await historyScreen.loadHistory();

    const history = historyScreen.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].poll_uuid).toBe('poll-open-city');
    expect(history[0].choice_uuid).toBe('opt-housing');
    expect(history[0].poll_status).toBe('open');

    const closedDetailScreen = new PollDetailScreenModel(controller, 'poll-closed-2025');
    await closedDetailScreen.load();

    expect(closedDetailScreen.getState().results).toBeDefined();
    expect(closedDetailScreen.getState().results?.winning_choice).toBe('opt-edu');
    expect(closedDetailScreen.getState().results?.vote_distribution['opt-edu']).toBe(245);

    const settingsScreen = new SettingsScreenModel(controller);
    await settingsScreen.load();
    const initialSig = settingsScreen.getState().voterSignature;
    expect(initialSig).toMatch(/^sig_/);

    await settingsScreen.resetIdentity();
    const resetSig = settingsScreen.getState().voterSignature;
    expect(resetSig).not.toBe(initialSig);
  });
});
