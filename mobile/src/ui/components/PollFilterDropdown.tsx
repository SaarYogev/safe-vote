import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface PollFilterOption {
  pollId: string;
  pollName: string;
  status?: string;
  voteCount?: number;
}

export interface PollFilterDropdownProps {
  options: PollFilterOption[];
  selectedPollIds: string[];
  onTogglePoll: (pollId: string) => void;
  onClearFilters: () => void;
  onSelectAll: () => void;
}

export function filterPollOptions(
  options: PollFilterOption[],
  searchQuery: string
): PollFilterOption[] {
  if (!searchQuery.trim()) {
    return options;
  }
  const query = searchQuery.toLowerCase();
  return options.filter(
    (opt) =>
      (opt.pollName?.toLowerCase() ?? '').includes(query) ||
      (opt.pollId?.toLowerCase() ?? '').includes(query)
  );
}

export const PollFilterDropdown: React.FC<PollFilterDropdownProps> = ({
  options,
  selectedPollIds,
  onTogglePoll,
  onClearFilters,
  onSelectAll,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    return filterPollOptions(options, searchQuery);
  }, [options, searchQuery]);

  const selectedCount = selectedPollIds.length;
  const isFiltered = selectedCount > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.triggerButton,
          { backgroundColor: colors.card, borderColor: isFiltered ? colors.accent : colors.border },
        ]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <View style={styles.triggerLeft}>
          <Text style={[styles.triggerLabel, { color: isFiltered ? colors.accent : colors.text }]}>
            Filter by poll
          </Text>
          {isFiltered && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>{selectedCount}</Text>
            </View>
          )}
        </View>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={isFiltered ? colors.accent : colors.textMuted}
        />
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            styles.dropdownCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Filter by poll</Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Icon name="close" size={12} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
            >
              <Icon name="search" size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Filter polls..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Icon name="close" size={12} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={[styles.actionsRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onSelectAll} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: colors.accent }]}>Select all</Text>
            </TouchableOpacity>
            {isFiltered && (
              <TouchableOpacity onPress={onClearFilters} activeOpacity={0.7}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No polls matching &ldquo;{searchQuery}&rdquo;
                </Text>
              </View>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedPollIds.includes(opt.pollId);
                const isOpenStatus = opt.status === 'open';

                return (
                  <TouchableOpacity
                    key={opt.pollId}
                    style={[
                      styles.itemRow,
                      { borderBottomColor: colors.divider },
                      isSelected && { backgroundColor: colors.cardSecondary },
                    ]}
                    onPress={() => onTogglePoll(opt.pollId)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: isSelected ? colors.accent : colors.border },
                        isSelected && { backgroundColor: colors.accent },
                      ]}
                    >
                      {isSelected && <Icon name="check" size={12} color="#FFFFFF" />}
                    </View>

                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isOpenStatus ? colors.success : colors.textMuted },
                      ]}
                    />

                    <View style={styles.itemTextContainer}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: colors.text },
                          isSelected && styles.itemNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {opt.pollName}
                      </Text>
                      {opt.status && (
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                          {isOpenStatus ? 'Voting active' : 'Closed'}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    zIndex: 10,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownCard: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: 36,
    padding: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listScroll: {
    maxHeight: 240,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemNameSelected: {
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
});
