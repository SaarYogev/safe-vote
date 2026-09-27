import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { AppController } from '../controllers/AppController';
import { PollsListScreenModel } from '../screens/PollsListScreen';
import { PollDetailScreenModel } from '../screens/PollDetailScreen';
import { VoteHistoryScreenModel } from '../screens/VoteHistoryScreen';
import { SettingsScreenModel } from '../screens/SettingsScreen';
import { PollsListView } from '../ui/PollsListView';
import { PollDetailView } from '../ui/PollDetailView';
import { VoteHistoryView } from '../ui/VoteHistoryView';
import { SettingsView } from '../ui/SettingsView';

export type NavigationTab = 'polls' | 'history' | 'settings';

export interface AppNavigatorProps {
  controller: AppController;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({ controller }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('polls');
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const pollsListModel = useMemo(() => new PollsListScreenModel(controller), [controller]);
  const voteHistoryModel = useMemo(() => new VoteHistoryScreenModel(controller), [controller]);
  const settingsModel = useMemo(() => new SettingsScreenModel(controller), [controller]);

  const pollDetailModel = useMemo(() => {
    return selectedPollId ? new PollDetailScreenModel(controller, selectedPollId) : null;
  }, [controller, selectedPollId]);

  const handleSelectPoll = (pollId: string) => {
    setSelectedPollId(pollId);
  };

  const handleBackToPolls = () => {
    setSelectedPollId(null);
  };

  const handleTabPress = (tab: NavigationTab) => {
    setActiveTab(tab);
    setSelectedPollId(null);
  };

  const renderActiveScreen = () => {
    if (selectedPollId && pollDetailModel) {
      return (
        <PollDetailView
          model={pollDetailModel}
          onBack={handleBackToPolls}
        />
      );
    }

    switch (activeTab) {
      case 'polls':
        return (
          <PollsListView
            model={pollsListModel}
            onSelectPoll={handleSelectPoll}
          />
        );
      case 'history':
        return (
          <VoteHistoryView
            model={voteHistoryModel}
            onSelectPoll={handleSelectPoll}
          />
        );
      case 'settings':
        return (
          <SettingsView
            model={settingsModel}
          />
        );
      default:
        return null;
    }
  };

  const getHeaderTitle = (): string => {
    if (selectedPollId) {
      return 'Poll Details';
    }
    switch (activeTab) {
      case 'polls':
        return 'SafeVote Polls';
      case 'history':
        return 'My Voting History';
      case 'settings':
        return 'Settings & Identity';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <Text style={styles.headerSubtitle}>Verified & Anonymous</Text>
        </View>
      </View>

      <View style={styles.screenContainer}>
        {renderActiveScreen()}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'polls' && !selectedPollId && styles.tabItemActive]}
          onPress={() => handleTabPress('polls')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>🗳️</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'polls' && !selectedPollId && styles.tabLabelActive,
            ]}
          >
            Polls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && !selectedPollId && styles.tabItemActive]}
          onPress={() => handleTabPress('history')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>📜</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'history' && !selectedPollId && styles.tabLabelActive,
            ]}
          >
            My History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && !selectedPollId && styles.tabItemActive]}
          onPress={() => handleTabPress('settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' && !selectedPollId && styles.tabLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  titleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#F2F2F7',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
