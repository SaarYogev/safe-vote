import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { PollsListScreenModel, PollsListState, PollsTab } from '../screens/PollsListScreen';
import { PollDetailsResponse } from '../types';

export interface PollsListViewProps {
  model: PollsListScreenModel;
  onSelectPoll: (pollId: string) => void;
}

export const PollsListView: React.FC<PollsListViewProps> = ({ model, onSelectPoll }) => {
  const [state, setState] = useState<PollsListState>(() => model.getState());

  useEffect(() => {
    const unsubscribe = model.subscribe(setState);
    model.loadPolls();
    return unsubscribe;
  }, [model]);

  const handleTabPress = (tab: PollsTab) => {
    model.setTab(tab);
  };

  const handleSearchChange = (text: string) => {
    model.setSearchQuery(text);
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime()) ? isoString : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderPollItem = ({ item }: ListRenderItemInfo<PollDetailsResponse>) => {
    const isOpen = item.status === 'open';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectPoll(item.uuid)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.pollTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
            <Text style={[styles.badgeText, isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateLabel}>
            {isOpen ? 'Closes: ' : 'Closed: '}
            <Text style={styles.dateValue}>{formatDate(item.close_date)}</Text>
          </Text>
          <Text style={styles.optionsCount}>
            {item.choices ? `${item.choices.length} options` : '0 options'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => {
    if (state.isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {state.activeTab === 'open' ? 'No Open Polls' : 'No Closed Polls'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {state.searchQuery
            ? `No polls match "${state.searchQuery}"`
            : `There are currently no ${state.activeTab} polls available.`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, state.activeTab === 'open' && styles.segmentButtonActive]}
          onPress={() => handleTabPress('open')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              state.activeTab === 'open' && styles.segmentTextActive,
            ]}
          >
            Open
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, state.activeTab === 'closed' && styles.segmentButtonActive]}
          onPress={() => handleTabPress('closed')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.segmentText,
              state.activeTab === 'closed' && styles.segmentTextActive,
            ]}
          >
            Closed
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search polls or options..."
          placeholderTextColor="#8E8E93"
          value={state.searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {state.searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => handleSearchChange('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {state.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => model.loadPolls()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.isLoading && state.rawPolls.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading polls...</Text>
        </View>
      ) : (
        <FlatList
          data={state.filteredPolls}
          renderItem={renderPollItem}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={state.isLoading}
              onRefresh={() => model.loadPolls()}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 9,
    padding: 2,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingRight: 32,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 8,
    padding: 6,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorBanner: {
    backgroundColor: '#FFEEEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#D70015',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8E8E93',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOpen: {
    backgroundColor: '#E8F8EE',
  },
  badgeClosed: {
    backgroundColor: '#EFEFF4',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeTextOpen: {
    color: '#34C759',
  },
  badgeTextClosed: {
    color: '#8E8E93',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 10,
  },
  dateLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  dateValue: {
    color: '#3A3A3C',
    fontWeight: '500',
  },
  optionsCount: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
