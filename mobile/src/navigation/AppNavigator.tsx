import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
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
import { useTheme } from '../ui/theme/ThemeContext';
import { Icon } from '../ui/components/Icon';

export type NavigationTab = 'polls' | 'history' | 'settings';

export interface AppNavigatorProps {
  controller: AppController;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({ controller }) => {
  const { colors } = useTheme();
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

  const isPollsActive = activeTab === 'polls' && !selectedPollId;
  const isHistoryActive = activeTab === 'history' && !selectedPollId;
  const isSettingsActive = activeTab === 'settings' && !selectedPollId;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.card} />

      <View style={[styles.topHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{getHeaderTitle()}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Verified & Anonymous</Text>
        </View>
      </View>

      <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
        {renderActiveScreen()}
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.tabBarBackground, borderTopColor: colors.tabBarBorder }]}>
        <TouchableOpacity
          style={[styles.tabItem, isPollsActive && { backgroundColor: colors.cardSecondary }]}
          onPress={() => handleTabPress('polls')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Icon
              name="poll"
              size={26}
              color={isPollsActive ? colors.accent : colors.textMuted}
              bgColor={isPollsActive ? colors.cardSecondary : colors.tabBarBackground}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: isPollsActive ? colors.accent : colors.textMuted },
              isPollsActive && styles.tabLabelActive,
            ]}
          >
            Polls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isHistoryActive && { backgroundColor: colors.cardSecondary }]}
          onPress={() => handleTabPress('history')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Icon
              name="history"
              size={26}
              color={isHistoryActive ? colors.accent : colors.textMuted}
              bgColor={isHistoryActive ? colors.cardSecondary : colors.tabBarBackground}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: isHistoryActive ? colors.accent : colors.textMuted },
              isHistoryActive && styles.tabLabelActive,
            ]}
          >
            My History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, isSettingsActive && { backgroundColor: colors.cardSecondary }]}
          onPress={() => handleTabPress('settings')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Icon
              name="settings"
              size={26}
              color={isSettingsActive ? colors.accent : colors.textMuted}
              bgColor={isSettingsActive ? colors.cardSecondary : colors.tabBarBackground}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: isSettingsActive ? colors.accent : colors.textMuted },
              isSettingsActive && styles.tabLabelActive,
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
    paddingTop: Platform.select({ ios: 48, android: (StatusBar.currentHeight ?? 24) + 6, default: 16 }),
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
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
  iconWrapper: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
