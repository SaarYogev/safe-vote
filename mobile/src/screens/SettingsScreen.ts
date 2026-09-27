import { AppController } from '../controllers/AppController';

export interface SettingsState {
  voterSignature: string;
  serverUrl: string;
  isLoading: boolean;
  message: string | null;
}

export class SettingsScreenModel {
  private state: SettingsState = {
    voterSignature: '',
    serverUrl: 'http://localhost:8001',
    isLoading: false,
    message: null,
  };

  private listeners: Array<(state: SettingsState) => void> = [];

  constructor(private controller: AppController) {}

  getState(): SettingsState {
    return { ...this.state };
  }

  subscribe(listener: (state: SettingsState) => void): () => void {
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
    this.state.message = null;
    this.notify();

    try {
      const signature = await this.controller.getVoterSignature();
      this.state.voterSignature = signature;
    } catch (err: any) {
      this.state.message = err?.message ?? 'Failed to load identity';
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }

  async resetIdentity(): Promise<void> {
    this.state.isLoading = true;
    this.state.message = null;
    this.notify();

    try {
      await this.controller.resetVoterIdentity();
      const newSignature = await this.controller.getVoterSignature();
      this.state.voterSignature = newSignature;
      this.state.message = 'Anonymous voter signature reset successfully';
    } catch (err: any) {
      this.state.message = err?.message ?? 'Failed to reset identity';
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }
}
