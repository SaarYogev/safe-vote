import React from 'react';
import { AppController } from '../src/controllers/AppController';
import { PollsListScreenModel } from '../src/screens/PollsListScreen';
import { PollDetailScreenModel } from '../src/screens/PollDetailScreen';
import { VoteHistoryScreenModel } from '../src/screens/VoteHistoryScreen';
import { SettingsScreenModel } from '../src/screens/SettingsScreen';
import { PollsListView } from '../src/ui/PollsListView';
import { PollDetailView } from '../src/ui/PollDetailView';
import { VoteHistoryView } from '../src/ui/VoteHistoryView';
import { SettingsView } from '../src/ui/SettingsView';
import { AppNavigator } from '../src/navigation/AppNavigator';
import { App, DefaultMemoryStorage, DefaultHttpTransport } from '../src/App';
import { StorageProvider } from '../src/services/IdentityService';
import { HttpTransport } from '../src/services/SafeVoteApiClient';

class MockStorage implements StorageProvider {
  private data = new Map<string, string>();
  async getItem(key: string) { return this.data.get(key) ?? null; }
  async setItem(key: string, value: string) { this.data.set(key, value); }
  async removeItem(key: string) { this.data.delete(key); }
}

class MockTransport implements HttpTransport {
  async request<T>(method: string, url: string, body?: any): Promise<T> {
    if (url.endsWith('/polls')) {
      return [] as T;
    }
    return {} as T;
  }
}

describe('UI Presentation Layer Integration', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController({
      baseUrl: 'http://localhost:8001',
      storage: new MockStorage(),
      transport: new MockTransport(),
    });
  });

  test('PollsListView initializes and creates element tree', () => {
    const model = new PollsListScreenModel(controller);
    const onSelect = jest.fn();
    const element = React.createElement(PollsListView, { model, onSelectPoll: onSelect });
    expect(element).toBeDefined();
    expect(element.props.model).toBe(model);
  });

  test('PollDetailView initializes and creates element tree', () => {
    const model = new PollDetailScreenModel(controller, 'poll-123');
    const onBack = jest.fn();
    const element = React.createElement(PollDetailView, { model, onBack });
    expect(element).toBeDefined();
    expect(element.props.model).toBe(model);
  });

  test('VoteHistoryView initializes and creates element tree', () => {
    const model = new VoteHistoryScreenModel(controller);
    const element = React.createElement(VoteHistoryView, { model });
    expect(element).toBeDefined();
    expect(element.props.model).toBe(model);
  });

  test('SettingsView initializes and creates element tree', () => {
    const model = new SettingsScreenModel(controller);
    const element = React.createElement(SettingsView, { model });
    expect(element).toBeDefined();
    expect(element.props.model).toBe(model);
  });

  test('AppNavigator instantiates and accepts controller', () => {
    const element = React.createElement(AppNavigator, { controller });
    expect(element).toBeDefined();
    expect(element.props.controller).toBe(controller);
  });

  test('App root component renders with default storage and transport', () => {
    const element = React.createElement(App, {});
    expect(element).toBeDefined();
  });

  test('DefaultMemoryStorage stores and retrieves keys', async () => {
    const storage = new DefaultMemoryStorage();
    await storage.setItem('test_key', 'test_val');
    expect(await storage.getItem('test_key')).toBe('test_val');
    await storage.removeItem('test_key');
    expect(await storage.getItem('test_key')).toBeNull();
  });

  test('DefaultHttpTransport throws Error instance with status attached', async () => {
    const transport = new DefaultHttpTransport();
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Poll not found' }),
      text: async () => 'Poll not found',
      headers: { get: () => 'application/json' },
    });

    try {
      await expect(transport.request('GET', 'http://localhost:8001/polls/invalid')).rejects.toThrow(
        'Poll not found'
      );
      try {
        await transport.request('GET', 'http://localhost:8001/polls/invalid');
      } catch (err: any) {
        expect(err).toBeInstanceOf(Error);
        expect(err.status).toBe(404);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
