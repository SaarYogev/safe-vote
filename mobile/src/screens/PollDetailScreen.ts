import { AppController } from '../controllers/AppController';
import { PollDetailsResponse, PollResultsResponse, VoteResponse } from '../types';
import { VoteReceipt } from '../services/VotingService';

export interface PollDetailState {
  pollId: string;
  poll: PollDetailsResponse | null;
  currentVote: VoteResponse | null;
  selectedChoiceUuid: string | null;
  results: PollResultsResponse | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
}

export class PollDetailScreenModel {
  private state: PollDetailState = {
    pollId: '',
    poll: null,
    currentVote: null,
    selectedChoiceUuid: null,
    results: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    successMessage: null,
  };

  private listeners: Array<(state: PollDetailState) => void> = [];

  constructor(
    private controller: AppController,
    pollId: string
  ) {
    this.state.pollId = pollId;
  }

  getState(): PollDetailState {
    return { ...this.state };
  }

  subscribe(listener: (state: PollDetailState) => void): () => void {
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

  async load(): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const poll = await this.controller.loadPollDetails(this.state.pollId);
      this.state.poll = poll;

      if (poll.status === 'open') {
        const userVote = await this.controller.getCurrentUserVote(poll.uuid);
        this.state.currentVote = userVote;
        if (userVote) {
          this.state.selectedChoiceUuid = userVote.choice_uuid;
        }
      } else if (poll.status === 'closed') {
        const results = await this.controller.loadPollResults(poll.uuid);
        this.state.results = results;
      }

      this.state.isLoading = false;
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.error = err?.message || 'Failed to load poll details';
    }

    this.notify();
  }

  selectChoice(choiceUuid: string) {
    if (this.state.poll?.status !== 'open') {
      return;
    }
    this.state.selectedChoiceUuid = choiceUuid;
    this.notify();
  }

  async submitVote(): Promise<VoteReceipt | null> {
    if (!this.state.poll) {
      this.state.error = 'No active poll';
      this.notify();
      return null;
    }

    if (this.state.poll.status !== 'open') {
      this.state.error = 'Cannot vote: poll is closed';
      this.notify();
      return null;
    }

    if (!this.state.selectedChoiceUuid) {
      this.state.error = 'Please select an option before voting';
      this.notify();
      return null;
    }

    this.state.isSubmitting = true;
    this.state.error = null;
    this.state.successMessage = null;
    this.notify();

    try {
      const isReCast = this.state.currentVote !== null;
      const receipt = isReCast
        ? await this.controller.reCastVote(this.state.poll, this.state.selectedChoiceUuid)
        : await this.controller.castVote(this.state.poll, this.state.selectedChoiceUuid);

      this.state.isSubmitting = false;
      this.state.currentVote = {
        uuid: 'receipt-' + Date.now(),
        signature: receipt.signature,
        choice_uuid: receipt.choiceUuid,
        poll_uuid: receipt.pollUuid,
        timestamp: receipt.timestamp,
      };
      this.state.successMessage = isReCast ? 'Vote updated successfully!' : 'Vote cast successfully!';
      this.notify();
      return receipt;
    } catch (err: any) {
      this.state.isSubmitting = false;
      this.state.error = err?.message || 'Failed to submit vote';
      this.notify();
      return null;
    }
  }
}
