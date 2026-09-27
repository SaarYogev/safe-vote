import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PollDetailScreenModel, PollDetailState } from '../screens/PollDetailScreen';
import { ChoiceResponse } from '../types';

export interface PollDetailViewProps {
  model: PollDetailScreenModel;
  onBack?: () => void;
}

export const PollDetailView: React.FC<PollDetailViewProps> = ({ model, onBack }) => {
  const [state, setState] = useState<PollDetailState>(() => model.getState());

  useEffect(() => {
    const unsubscribe = model.subscribe(setState);
    model.load();
    return unsubscribe;
  }, [model]);

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

  if (state.isLoading && !state.poll) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading poll details...</Text>
      </View>
    );
  }

  if (!state.poll) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Poll Not Found</Text>
        <Text style={styles.errorMessage}>{state.error || 'Unable to retrieve poll details.'}</Text>
        {onBack && (
          <TouchableOpacity style={styles.backButtonLarge} onPress={onBack}>
            <Text style={styles.backButtonLargeText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isOpen = state.poll.status === 'open';
  const hasExistingVote = Boolean(state.currentVote);
  const choices: ChoiceResponse[] = state.poll.choices ?? [];

  const voteDistribution = state.results?.vote_distribution ?? {};
  const totalVotes = Object.values(voteDistribution).reduce((sum, count) => sum + count, 0);
  const winningChoiceUuid = state.results?.winning_choice ?? null;

  return (
    <View style={styles.container}>
      {onBack && (
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonArrow}>‹</Text>
            <Text style={styles.backButtonText}>Polls</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pollHeaderCard}>
          <View style={styles.statusRow}>
            <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
              <Text style={[styles.badgeText, isOpen ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {isOpen ? `Closes ${formatDate(state.poll.close_date)}` : `Closed ${formatDate(state.poll.close_date)}`}
            </Text>
          </View>

          <Text style={styles.pollTitle}>{state.poll.name}</Text>
        </View>

        {hasExistingVote && isOpen && (
          <View style={styles.recastBanner}>
            <Text style={styles.recastIcon}>ℹ️</Text>
            <View style={styles.recastTextContainer}>
              <Text style={styles.recastTitle}>Previous Ballot Recorded</Text>
              <Text style={styles.recastSubtitle}>
                You have already voted in this poll. Submitting a new selection will re-cast and update your ballot.
              </Text>
            </View>
          </View>
        )}

        {state.error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{state.error}</Text>
          </View>
        )}

        {state.successMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{state.successMessage}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isOpen ? 'Select an Option' : 'Results & Distribution'}
          </Text>
          {!isOpen && (
            <Text style={styles.totalVotesLabel}>{totalVotes} total votes</Text>
          )}
        </View>

        {isOpen ? (
          <View style={styles.choicesContainer}>
            {choices.map((choice) => {
              const isSelected = state.selectedChoiceUuid === choice.uuid;
              const isVotedChoice = state.currentVote?.choice_uuid === choice.uuid;

              return (
                <TouchableOpacity
                  key={choice.uuid}
                  style={[
                    styles.choiceCard,
                    isSelected && styles.choiceCardSelected,
                  ]}
                  onPress={() => model.selectChoice(choice.uuid)}
                  disabled={state.isSubmitting}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioRow}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.choiceTextContainer}>
                      <Text
                        style={[
                          styles.choiceName,
                          isSelected && styles.choiceNameSelected,
                        ]}
                      >
                        {choice.name}
                      </Text>
                      {isVotedChoice && (
                        <Text style={styles.currentVoteTag}>Current Ballot</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!state.selectedChoiceUuid || state.isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={() => model.submitVote()}
              disabled={!state.selectedChoiceUuid || state.isSubmitting}
              activeOpacity={0.8}
            >
              {state.isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {hasExistingVote ? 'Re-cast Vote' : 'Cast Vote'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {choices.map((choice) => {
              const votes = voteDistribution[choice.uuid] ?? 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isWinner = choice.uuid === winningChoiceUuid;

              return (
                <View
                  key={choice.uuid}
                  style={[
                    styles.resultCard,
                    isWinner && styles.resultCardWinner,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <View style={styles.resultChoiceTitleContainer}>
                      <Text style={[styles.resultChoiceName, isWinner && styles.resultChoiceNameWinner]}>
                        {choice.name}
                      </Text>
                      {isWinner && (
                        <View style={styles.winnerBadge}>
                          <Text style={styles.winnerBadgeText}>★ Winner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.voteCountText}>
                      {votes} {votes === 1 ? 'vote' : 'votes'} ({percentage}%)
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
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonArrow: {
    fontSize: 26,
    color: '#007AFF',
    marginRight: 4,
    lineHeight: 26,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pollHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  pollTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 26,
  },
  recastBanner: {
    flexDirection: 'row',
    backgroundColor: '#EBF3FE',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  recastIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  recastTextContainer: {
    flex: 1,
  },
  recastTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0051A8',
    marginBottom: 2,
  },
  recastSubtitle: {
    fontSize: 12,
    color: '#3A3A3C',
    lineHeight: 16,
  },
  errorBanner: {
    backgroundColor: '#FFEEEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#D70015',
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: '#E8F8EE',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#248A3D',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A3A3C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalVotesLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  choicesContainer: {
    marginBottom: 16,
  },
  choiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  choiceCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F5F9FF',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#007AFF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  choiceNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  currentVoteTag: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0B0B5',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  resultCardWinner: {
    borderColor: '#34C759',
    borderWidth: 2,
    backgroundColor: '#F7FCF8',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultChoiceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  resultChoiceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  resultChoiceNameWinner: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  winnerBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginLeft: 8,
  },
  winnerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  voteCountText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#EFEFF4',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarFillRegular: {
    backgroundColor: '#8E8E93',
  },
  progressBarFillWinner: {
    backgroundColor: '#34C759',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButtonLarge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
