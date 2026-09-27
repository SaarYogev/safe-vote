import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { VoteHistoryScreenModel, VoteHistoryState } from '../screens/VoteHistoryScreen';
import { VoteHistoryItem } from '../types';

export interface VoteHistoryViewProps {
  model: VoteHistoryScreenModel;
  onSelectPoll?: (pollId: string) => void;
}

export const VoteHistoryView: React.FC<VoteHistoryViewProps> = ({ model, onSelectPoll }) => {
  const [state, setState] = useState<VoteHistoryState>(() => model.getState());
  const [knownPollIds, setKnownPollIds] = useState<string[]>(() =>
    Array.from(new Set(model.getState().history.map((item) => item.poll_uuid)))
  );

  useEffect(() => {
    const unsubscribe = model.subscribe((newState) => {
      setState(newState);
      if (newState.history.length > 0) {
        const newIds = newState.history.map((item) => item.poll_uuid);
        setKnownPollIds((prev) => Array.from(new Set([...prev, ...newIds])));
      }
    });
    model.loadHistory();
    return unsubscribe;
  }, [model]);

  const handleTogglePollFilter = (pollId: string) => {
    const isSelected = state.selectedPollIds.includes(pollId);
    let updated: string[];

    if (isSelected) {
      updated = state.selectedPollIds.filter((id) => id !== pollId);
    } else {
      updated = [...state.selectedPollIds, pollId];
    }

    model.filterByPoll(updated.length > 0 ? updated : null);
  };

  const handleClearFilter = () => {
    model.filterByPoll(null);
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

  const renderBreakdown = () => {
    if (!state.selectedPollBreakdown) return null;

    const breakdown = state.selectedPollBreakdown;
    const distribution = breakdown.vote_distribution ?? {};
    const totalVotes = Object.values(distribution).reduce((acc, count) => acc + count, 0);

    return (
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownHeader}>
          <View style={styles.breakdownTitleContainer}>
            <Text style={styles.breakdownTitle}>Poll Results Breakdown</Text>
            <Text style={styles.breakdownSubtitle}>
              Poll: {state.breakdownPollId?.slice(0, 14)}...
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBreakdownButton}
            onPress={() => model.clearBreakdown()}
          >
            <Text style={styles.closeBreakdownText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.breakdownContent}>
          <Text style={styles.breakdownTotalVotes}>{totalVotes} Total Votes Cast</Text>

          {Object.entries(distribution).map(([choiceUuid, voteCount]) => {
            const isWinner = choiceUuid === breakdown.winning_choice;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            return (
              <View key={choiceUuid} style={styles.breakdownRow}>
                <View style={styles.breakdownRowHeader}>
                  <Text style={[styles.breakdownChoiceUuid, isWinner && styles.breakdownWinnerChoiceUuid]}>
                    Choice: {choiceUuid.slice(0, 12)}...
                    {isWinner && '  ★ WINNER'}
                  </Text>
                  <Text style={styles.breakdownVoteCount}>
                    {voteCount} votes ({percentage}%)
                  </Text>
                </View>

                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      isWinner ? styles.progressBarFillWinner : styles.progressBarFillRegular,
                      { width: `${percentage}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }: ListRenderItemInfo<VoteHistoryItem>) => {
    const isClosed = item.poll_status === 'closed';
    const isWinningChoice = item.is_winning_choice === true;

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeOpen]}>
              <Text style={[styles.statusBadgeText, isClosed ? styles.statusBadgeTextClosed : styles.statusBadgeTextOpen]}>
                {item.poll_status ? item.poll_status.toUpperCase() : 'UNKNOWN'}
              </Text>
            </View>
            <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
          </View>

          {isClosed && typeof item.is_winning_choice === 'boolean' && (
            <View
              style={[
                styles.winningBadge,
                isWinningChoice ? styles.winningBadgeSuccess : styles.winningBadgeNeutral,
              ]}
            >
              <Text
                style={[
                  styles.winningBadgeText,
                  isWinningChoice ? styles.winningBadgeTextSuccess : styles.winningBadgeTextNeutral,
                ]}
              >
                {isWinningChoice ? '★ Winning Choice' : 'Non-winning'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Poll ID:</Text>
            <Text style={styles.idValue} numberOfLines={1} ellipsizeMode="middle">
              {item.poll_uuid}
            </Text>
          </View>

          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Choice ID:</Text>
            <Text style={styles.idValue} numberOfLines={1} ellipsizeMode="middle">
              {item.choice_uuid}
            </Text>
          </View>

          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Receipt Signature:</Text>
            <Text style={styles.signatureValue} numberOfLines={1} ellipsizeMode="middle">
              {item.signature}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {isClosed && (
            <TouchableOpacity
              style={styles.actionButtonOutline}
              onPress={() => model.viewClosedPollBreakdown(item.poll_uuid)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonOutlineText}>View Results Breakdown</Text>
            </TouchableOpacity>
          )}

          {onSelectPoll && (
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => onSelectPoll(item.poll_uuid)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionButtonPrimaryText}>Open Poll</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (state.isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Ballots Found</Text>
        <Text style={styles.emptySubtitle}>
          {state.selectedPollIds.length > 0
            ? 'No votes match the selected poll filter.'
            : 'You have not cast any votes yet. Check out the Polls tab to get started!'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {knownPollIds.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Poll:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                state.selectedPollIds.length === 0 && styles.filterPillActive,
              ]}
              onPress={handleClearFilter}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  state.selectedPollIds.length === 0 && styles.filterPillTextActive,
                ]}
              >
                All Polls ({state.history.length})
              </Text>
            </TouchableOpacity>

            {knownPollIds.map((pollId) => {
              const isSelected = state.selectedPollIds.includes(pollId);
              return (
                <TouchableOpacity
                  key={pollId}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => handleTogglePollFilter(pollId)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextActive,
                    ]}
                  >
                    Poll {pollId.slice(0, 8)}...
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {state.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => model.loadHistory()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderBreakdown()}

      {state.isLoading && state.history.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading vote history...</Text>
        </View>
      ) : (
        <FlatList
          data={state.history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={state.isLoading}
              onRefresh={() => model.loadHistory()}
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterPillText: {
    fontSize: 13,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  breakdownTitleContainer: {
    flex: 1,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  breakdownSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBreakdownButton: {
    padding: 4,
  },
  closeBreakdownText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '700',
  },
  breakdownContent: {
    marginTop: 4,
  },
  breakdownTotalVotes: {
    fontSize: 13,
    color: '#3A3A3C',
    fontWeight: '600',
    marginBottom: 10,
  },
  breakdownRow: {
    marginBottom: 10,
  },
  breakdownRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownChoiceUuid: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  breakdownWinnerChoiceUuid: {
    fontWeight: '700',
    color: '#34C759',
  },
  breakdownVoteCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#EFEFF4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarFillRegular: {
    backgroundColor: '#8E8E93',
  },
  progressBarFillWinner: {
    backgroundColor: '#34C759',
  },
  errorBanner: {
    backgroundColor: '#FFEEEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginRight: 8,
  },
  statusBadgeOpen: {
    backgroundColor: '#E8F8EE',
  },
  statusBadgeClosed: {
    backgroundColor: '#EFEFF4',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeTextOpen: {
    color: '#34C759',
  },
  statusBadgeTextClosed: {
    color: '#8E8E93',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  winningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winningBadgeSuccess: {
    backgroundColor: '#E8F8EE',
  },
  winningBadgeNeutral: {
    backgroundColor: '#F2F2F7',
  },
  winningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  winningBadgeTextSuccess: {
    color: '#34C759',
  },
  winningBadgeTextNeutral: {
    color: '#8E8E93',
  },
  cardBody: {
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  idLabel: {
    fontSize: 12,
    color: '#8E8E93',
    width: 110,
    fontWeight: '500',
  },
  idValue: {
    fontSize: 12,
    color: '#1C1C1E',
    flex: 1,
    fontFamily: 'monospace',
  },
  signatureValue: {
    fontSize: 11,
    color: '#007AFF',
    flex: 1,
    fontFamily: 'monospace',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButtonOutline: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonOutlineText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButtonPrimary: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonPrimaryText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#8E8E93',
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
