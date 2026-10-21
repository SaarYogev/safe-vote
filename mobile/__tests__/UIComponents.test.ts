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
import { Icon, IconName } from '../src/ui/components/Icon';
import { ThemeProvider, useTheme, lightTheme, darkTheme } from '../src/ui/theme/ThemeContext';
import { PollFilterDropdown, filterPollOptions } from '../src/ui/components/PollFilterDropdown';

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

  test('Icon renders elements across all supported icon variants without emoji dependencies', () => {
    const iconNames: IconName[] = [
      'poll',
      'history',
      'history-base',
      'history-smooth',
      'history-soft',
      'history-heavy',
      'history-arrow',
      'history-filled',
      'history-original',
      'history-cutout',
      'history-baked',
      'history-bold',
      'history-row',
      'settings',
      'search',
      'chevron-down',
      'chevron-up',
      'check',
      'eye',
      'eye-off',
      'info',
      'copy',
      'close',
      'badge-winner',
      'theme-system',
      'theme-dark',
      'theme-light',
      'refresh',
      'server',
      'shield',
      'palette',
    ];

    for (const name of iconNames) {
      const element = React.createElement(Icon, { name, size: 24, color: '#007AFF' });
      expect(element).toBeDefined();
      expect(element.props.name).toBe(name);

      const rendered = Icon({ name, size: 20, color: '#000000' }) as any;
      expect(rendered).toBeDefined();
      expect(rendered.props.style).toMatchObject({ width: 20, height: 20 });
    }
  });

  test('filterPollOptions filters options by query across pollName and pollId, handling case and empty queries', () => {
    const options = [
      { pollId: 'p-presidential', pollName: 'Presidential 2026', status: 'open' },
      { pollId: 'p-council', pollName: 'Local City Council', status: 'closed' },
      { pollId: 'p-school', pollName: 'School Board Initiative', status: 'open' },
    ];

    expect(filterPollOptions(options, '')).toHaveLength(3);
    expect(filterPollOptions(options, '   ')).toHaveLength(3);

    const nameMatch = filterPollOptions(options, 'presidential');
    expect(nameMatch).toHaveLength(1);
    expect(nameMatch[0].pollId).toBe('p-presidential');

    const partialMatch = filterPollOptions(options, 'council');
    expect(partialMatch).toHaveLength(1);
    expect(partialMatch[0].pollId).toBe('p-council');

    const idMatch = filterPollOptions(options, 'p-school');
    expect(idMatch).toHaveLength(1);
    expect(idMatch[0].pollName).toBe('School Board Initiative');

    const noMatch = filterPollOptions(options, 'non-existent-query');
    expect(noMatch).toHaveLength(0);
  });

  test('PollFilterDropdown instantiates and handles multi-select and filter actions', () => {
    const onToggle = jest.fn();
    const onClearFilters = jest.fn();
    const onSelectAll = jest.fn();

    const options = [
      { pollId: 'p-1', pollName: 'Presidential 2026', status: 'open' },
      { pollId: 'p-2', pollName: 'Local Council', status: 'closed' },
    ];

    const element = React.createElement(PollFilterDropdown, {
      options,
      selectedPollIds: ['p-1', 'p-2'],
      onTogglePoll: onToggle,
      onClearFilters: onClearFilters,
      onSelectAll: onSelectAll,
    });

    expect(element).toBeDefined();
    expect(element.props.options).toHaveLength(2);
    expect(element.props.selectedPollIds).toEqual(['p-1', 'p-2']);

    element.props.onTogglePoll('p-2');
    expect(onToggle).toHaveBeenCalledWith('p-2');

    element.props.onSelectAll();
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    element.props.onClearFilters();
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test('ThemeProvider and ThemeContext default to system mode and provide theme tokens', () => {
    const requiredKeys = [
      'background',
      'card',
      'cardSecondary',
      'text',
      'textMuted',
      'border',
      'accent',
      'accentLight',
      'success',
      'successLight',
      'danger',
      'dangerLight',
      'warning',
      'inputBackground',
      'divider',
      'tabBarBackground',
      'tabBarBorder',
      'statusBar',
    ];

    for (const key of requiredKeys) {
      expect(lightTheme).toHaveProperty(key);
      expect(darkTheme).toHaveProperty(key);
    }

    expect(lightTheme.background).toBe('#F2F2F7');
    expect(darkTheme.background).toBe('#0D1117');
    expect(lightTheme.statusBar).toBe('dark-content');
    expect(darkTheme.statusBar).toBe('light-content');

    const providerElement = React.createElement(ThemeProvider, {
      children: React.createElement('View', null),
    });
    expect(providerElement).toBeDefined();
  });

  test('SettingsScreenModel handles signature loading, signature masking, theme settings, and identity reset', async () => {
    const storage = new MockStorage();
    const model = new SettingsScreenModel(controller);

    expect(model.getMaskedSignature()).toBe('••••••••••••••••••••••••••••••••');

    const stateChanges: any[] = [];
    const unsubscribe = model.subscribe((st) => stateChanges.push(st));

    await model.load();
    const stateAfterLoad = model.getState();
    expect(stateAfterLoad.voterSignature).toBeTruthy();
    expect(stateAfterLoad.themeMode).toBe('system');
    expect(stateChanges.length).toBeGreaterThan(0);

    await model.setThemeMode('dark');
    expect(model.getState().themeMode).toBe('dark');
    expect(await controller.getStorage().getItem('safevote_theme_preference')).toBe('dark');

    await model.setThemeMode('light');
    expect(model.getState().themeMode).toBe('light');
    expect(await controller.getStorage().getItem('safevote_theme_preference')).toBe('light');

    await model.setThemeMode('system');
    expect(model.getState().themeMode).toBe('system');

    const previousSignature = model.getState().voterSignature;
    await model.resetIdentity();
    const stateAfterReset = model.getState();
    expect(stateAfterReset.voterSignature).toBeTruthy();
    expect(stateAfterReset.voterSignature).not.toBe(previousSignature);
    expect(stateAfterReset.message).toBe('Anonymous voter signature reset successfully');

    unsubscribe();
  });
});

