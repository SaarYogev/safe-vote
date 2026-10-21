import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
  Alert,
} from 'react-native';
import { VoteHistoryScreenModel, VoteHistoryState } from '../screens/VoteHistoryScreen';
import { VoteHistoryItem } from '../types';
import { useTheme } from './theme/ThemeContext';
import { Icon } from './components/Icon';
import { PollFilterDropdown, PollFilterOption } from './components/PollFilterDropdown';

export interface VoteHistoryViewProps {
  model: VoteHistoryScreenModel;
  onSelectPoll?: (pollId: string) => void;
}

export const VoteHistoryView: React.FC<VoteHistoryViewProps> = ({ model, onSelectPoll }) => {
  const { colors } = useTheme();
  const [state, setState] = useState<VoteHistoryState>(() => model.getState());
  const [expandedAudits, setExpandedAudits] = useState<Record<string, boolean>>({});
  const [knownPollMap, setKnownPollMap] = useState<Map<string, PollFilterOption>>(new Map());

  useEffect(() => {
    const unsubscribe = model.subscribe((newState) => {
      setState(newState);
      if (newState.history.length > 0) {
        setKnownPollMap((prev) => {
          const next = new Map(prev);
          for (const item of newState.history) {
            if (!next.has(item.poll_uuid)) {
              next.set(item.poll_uuid, {
                pollId: item.poll_uuid,
                pollName: item.poll_name || `Poll ${item.poll_uuid.slice(0, 8)}`,
                status: item.poll_status,
              });
            }
          }
          return next;
        });
      }
    });
    model.loadHistory();
    return unsubscribe;
  }, [model]);

  const pollOptions: PollFilterOption[] = useMemo(() => {
    return Array.from(knownPollMap.values());
  }, [knownPollMap]);

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

  const handleClearFilters = () => {
    model.filterByPoll(null);
  };

  const handleSelectAll = () => {
    const allIds = pollOptions.map((o) => o.pollId);
    model.filterByPoll(allIds);
  };

  const toggleAudit = (uuid: string) => {
    setExpandedAudits((prev) => ({
      ...prev,
      [uuid]: !prev[uuid],
    }));
  };

  const copyAuditData = (item: VoteHistoryItem) => {
    const details = `Ballot: ${item.uuid}\nPoll: ${item.poll_uuid}\nChoice: ${item.choice_uuid}\nSignature: ${item.signature}`;
    Alert.alert('Verification Data Copied', details);
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return isNaN(date.getTime())
        ? isoString
        : date.toLocaleDateString(undefined, {
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
      <View
        style={[
          styles.breakdownCard,
          { backgroundColor: colors.card, borderColor: colors.accent },
        ]}
      >
        <View style={styles.breakdownHeader}>
          <View style={styles.breakdownTitleContainer}>
            <Text style={[styles.breakdownTitle, { color: colors.text }]}>Poll Results Breakdown</Text>
            <Text style={[styles.breakdownSubtitle, { color: colors.textMuted }]}>
              {knownPollMap.get(state.breakdownPollId ?? '')?.pollName ||
                `Poll ${state.breakdownPollId?.slice(0, 8)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBreakdownButton}
            onPress={() => model.clearBreakdown()}
          >
            <Icon name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.breakdownContent}>
          <Text style={[styles.breakdownTotalVotes, { color: colors.text }]}>
            {totalVotes} Total Votes Cast
          </Text>

          {Object.entries(distribution).map(([choiceUuid, voteCount]) => {
            const isWinner = choiceUuid === breakdown.winning_choice;
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

            return (
              <View key={choiceUuid} style={styles.breakdownRow}>
                <View style={styles.breakdownRowHeader}>
                  <Text
                    style={[
                      styles.breakdownChoiceUuid,
                      { color: colors.text },
                      isWinner && { color: colors.success, fontWeight: '700' },
                    ]}
                  >
                    Choice {choiceUuid.slice(0, 8)}
                    {isWinner && '  Winner'}
                  </Text>
                  <Text style={[styles.breakdownVoteCount, { color: colors.textMuted }]}>
                    {voteCount} votes ({percentage}%)
                  </Text>
                </View>

                <View style={[styles.progressBarTrack, { backgroundColor: colors.cardSecondary }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: isWinner ? colors.success : colors.textMuted,
                      },
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
    const isAuditExpanded = Boolean(expandedAudits[item.uuid]);

    const pollTitle = item.poll_name || `Poll ${item.poll_uuid.slice(0, 8)}`;
    const choiceTitle = item.choice_name || `Choice ${item.choice_uuid.slice(0, 8)}`;

    return (
      <View
        style={[
          styles.historyCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isClosed ? colors.cardSecondary : colors.successLight },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isClosed ? colors.textMuted : colors.success },
                ]}
              >
                {item.poll_status ? item.poll_status.toUpperCase() : 'UNKNOWN'}
              </Text>
            </View>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>

          {isClosed && typeof item.is_winning_choice === 'boolean' && (
            <View
              style={[
                styles.winningBadge,
                { backgroundColor: isWinningChoice ? colors.successLight : colors.cardSecondary },
              ]}
            >
              {isWinningChoice && <Icon name="badge-winner" size={14} color={colors.success} />}
              <Text
                style={[
                  styles.winningBadgeText,
                  { color: isWinningChoice ? colors.success : colors.textMuted },
                ]}
              >
                {isWinningChoice ? 'Winning Choice' : 'Non-winning'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardTitleArea}>
          <Text style={[styles.pollCardTitle, { color: colors.text }]}>{pollTitle}</Text>
          <View style={[styles.choiceSelectionRow, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.choiceLabel, { color: colors.textMuted }]}>Your Vote:</Text>
            <Text style={[styles.choiceValue, { color: colors.text }]}>{choiceTitle}</Text>
          </View>
        </View>

        <View style={[styles.auditSection, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.auditToggleRow}
            onPress={() => toggleAudit(item.uuid)}
            activeOpacity={0.7}
          >
            <Text style={[styles.auditToggleText, { color: colors.textMuted }]}>
              {isAuditExpanded ? 'Hide Verification Details' : 'Show Verification Details'}
            </Text>
            <Icon
              name={isAuditExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {isAuditExpanded && (
            <View style={[styles.auditBody, { backgroundColor: colors.inputBackground }]}>
              <View style={styles.idRow}>
                <Text style={[styles.idLabel, { color: colors.textMuted }]}>Ballot Ref:</Text>
                <Text style={[styles.idValue, { color: colors.text }]} numberOfLines={1}>
                  {item.uuid}
                </Text>
              </View>

              <View style={styles.idRow}>
                <Text style={[styles.idLabel, { color: colors.textMuted }]}>Poll UUID:</Text>
                <Text style={[styles.idValue, { color: colors.text }]} numberOfLines={1}>
                  {item.poll_uuid}
                </Text>
              </View>

              <View style={styles.idRow}>
                <Text style={[styles.idLabel, { color: colors.textMuted }]}>Choice UUID:</Text>
                <Text style={[styles.idValue, { color: colors.text }]} numberOfLines={1}>
                  {item.choice_uuid}
                </Text>
              </View>

              <View style={styles.idRow}>
                <Text style={[styles.idLabel, { color: colors.textMuted }]}>Receipt Sig:</Text>
                <Text style={[styles.signatureValue, { color: colors.accent }]} numberOfLines={1}>
                  {item.signature}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyAuditButton, { borderColor: colors.border }]}
                onPress={() => copyAuditData(item)}
                activeOpacity={0.7}
              >
                <Icon name="copy" size={16} color={colors.accent} />
                <Text style={[styles.copyAuditText, { color: colors.accent }]}>
                  Copy Verification Data
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          {isClosed && (
            <TouchableOpacity
              style={[styles.actionButtonOutline, { borderColor: colors.accent }]}
              onPress={() => model.viewClosedPollBreakdown(item.poll_uuid)}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionButtonOutlineText, { color: colors.accent }]}>
                View Breakdown
              </Text>
            </TouchableOpacity>
          )}

          {onSelectPoll && (
            <TouchableOpacity
              style={[styles.actionButtonPrimary, { backgroundColor: colors.accent }]}
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
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Ballots Found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          {state.selectedPollIds.length > 0
            ? 'No votes match the selected poll filter.'
            : 'You have not cast any votes yet. Check out the Polls tab to get started!'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {pollOptions.length > 0 && (
        <PollFilterDropdown
          options={pollOptions}
          selectedPollIds={state.selectedPollIds}
          onTogglePoll={handleTogglePollFilter}
          onClearFilters={handleClearFilters}
          onSelectAll={handleSelectAll}
        />
      )}

      {state.error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight, borderLeftColor: colors.danger }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{state.error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.danger }]}
            onPress={() => model.loadHistory()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {renderBreakdown()}

      {state.isLoading && state.history.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading vote history...</Text>
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
              tintColor={colors.accent}
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
  },
  breakdownCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
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
    fontSize: 15,
    fontWeight: '700',
  },
  breakdownSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBreakdownButton: {
    padding: 4,
  },
  breakdownContent: {
    marginTop: 4,
  },
  breakdownTotalVotes: {
    fontSize: 13,
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
    fontWeight: '500',
  },
  breakdownVoteCount: {
    fontSize: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  errorBanner: {
    borderLeftWidth: 4,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 12,
  },
  winningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitleArea: {
    marginBottom: 12,
  },
  pollCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  choiceSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  choiceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  choiceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  auditSection: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 10,
  },
  auditToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  auditToggleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  auditBody: {
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  idLabel: {
    fontSize: 11,
    width: 90,
    fontWeight: '500',
  },
  idValue: {
    fontSize: 11,
    flex: 1,
    fontFamily: 'monospace',
  },
  signatureValue: {
    fontSize: 11,
    flex: 1,
    fontFamily: 'monospace',
  },
  copyAuditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  copyAuditText: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  actionButtonOutlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonPrimary: {
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
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
