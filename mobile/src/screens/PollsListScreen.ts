import { AppController } from '../controllers/AppController';
import { PollDetailsResponse } from '../types';

export type PollsTab = 'open' | 'closed';

export interface PollsListState {
  activeTab: PollsTab;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  rawPolls: PollDetailsResponse[];
  filteredPolls: PollDetailsResponse[];
}

export class PollsListScreenModel {
  private state: PollsListState = {
    activeTab: 'open',
    searchQuery: '',
    isLoading: false,
    error: null,
    rawPolls: [],
    filteredPolls: [],
  };

  private listeners: Array<(state: PollsListState) => void> = [];

  constructor(private controller: AppController) {}

  getState(): PollsListState {
    return { ...this.state };
  }

  subscribe(listener: (state: PollsListState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.updateFilteredPolls();
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  private updateFilteredPolls() {
    this.state.filteredPolls = this.controller.filterPolls(this.state.rawPolls, {
      status: this.state.activeTab,
      query: this.state.searchQuery,
    });
  }

  async loadPolls(): Promise<void> {
    this.state.isLoading = true;
    this.state.error = null;
    this.notify();

    try {
      const polls = await this.controller.loadPolls();
      this.state.rawPolls = polls;
      this.state.isLoading = false;
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.error = err?.message || 'Failed to load polls';
    }

    this.notify();
  }

  setTab(tab: PollsTab) {
    if (this.state.activeTab !== tab) {
      this.state.activeTab = tab;
      this.notify();
    }
  }

  setSearchQuery(query: string) {
    this.state.searchQuery = query;
    this.notify();
  }
}
