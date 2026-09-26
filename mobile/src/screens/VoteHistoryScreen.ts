import { AppController } from '../controllers/AppController';
import { VoteHistoryItem, PollResultsResponse } from '../types';

export interface VoteHistoryState {
  history: VoteHistoryItem[];
  selectedPollIds: string[];
  isLoading: boolean;
  error: string | null;
  selectedPollBreakdown: PollResultsResponse | null;
  breakdownPollId: string | null;
}

export class VoteHistoryScreenModel {
  private state: VoteHistoryState = {
    history: [],
    selectedPollIds: [],
    isLoading: false,
    error: null,
    selectedPollBreakdown: null,
    breakdownPollId: null,
  };

  private listeners: Array<(state: VoteHistoryState) => void> = [];

  constructor(private controller: AppController) {}

  getState(): VoteHistoryState {
    return { ...this.state };
  }

  subscribe(listener: (state: VoteHistoryState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  async loadHistory(): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const filter = this.state.selectedPollIds.length > 0
        ? { pollIds: this.state.selectedPollIds }
        : {};
      const history = await this.controller.loadVoteHistory(filter);
      this.state.history = history;
      this.state.isLoading = false;
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.error = err?.message || 'Failed to load vote history';
    }

    this.notify();
  }

  async filterByPoll(pollId: string | string[] | null): Promise<void> {
    if (Array.isArray(pollId)) {
      this.state.selectedPollIds = pollId;
    } else if (pollId) {
      this.state.selectedPollIds = [pollId];
    } else {
      this.state.selectedPollIds = [];
    }
    await this.loadHistory();
  }

  async viewClosedPollBreakdown(pollId: string): Promise<void> {
    try {
      const breakdown = await this.controller.loadPollResults(pollId);
      this.state.selectedPollBreakdown = breakdown;
      this.state.breakdownPollId = pollId;
    } catch (err: any) {
      this.state.error = err?.message || 'Failed to load poll breakdown';
    }
    this.notify();
  }

  clearBreakdown() {
    this.state.selectedPollBreakdown = null;
    this.state.breakdownPollId = null;
    this.notify();
  }
}
