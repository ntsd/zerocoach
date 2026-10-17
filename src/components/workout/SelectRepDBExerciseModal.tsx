import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AppModal } from '@/components/common/AppModal';
import { RepDBExercise } from '@/types/exercise';
import { ExerciseItem } from '@/types/workout';
import { CoachingMode } from '@/types/coach';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { exerciseRepository } from '@/services/workout/exerciseRepository';
import { getRepDBImageUrl } from '@/services/workout/workoutPlanGenerator';
import {
  Search,
  X,
  Dumbbell,
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
  Flame,
  Check,
} from 'lucide-react-native';

interface SelectRepDBExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (repDbExercise: RepDBExercise) => void;
  mode: CoachingMode;
  swapTargetExercise?: ExerciseItem | null;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'back', label: 'Back' },
  { id: 'chest', label: 'Chest' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'legs', label: 'Legs' },
  { id: 'core', label: 'Core' },
  { id: 'bodyweight', label: 'Bodyweight' },
];

const POPULAR_SUGGESTIONS = [
  'Pull-up',
  'Chin-up',
  'Dips',
  'Push-up',
  'Muscle-up',
  'Squat',
  'Pistol Squat',
  'Bench Press',
  'Deadlift',
  'Overhead Press',
];

function formatBadgeText(text?: string): string {
  if (!text) return '';
  return text
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const SelectRepDBExerciseModal: React.FC<SelectRepDBExerciseModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  mode,
  swapTargetExercise,
}) => {
  const modeColors = getModeColors(mode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  // Filtered exercises from RepDB dataset (643 exercises total)
  const filteredExercises = useMemo(() => {
    let result = exerciseRepository.getAll();

    // 1. Category / Muscle Tab Filter
    if (selectedTab === 'bodyweight') {
      result = result.filter((e) => e.is_bodyweight || e.equipment === 'bodyweight');
    } else if (selectedTab === 'back') {
      result = result.filter(
        (e) =>
          e.body_part === 'back' ||
          e.primary_muscles.some((m) =>
            ['lats', 'latissimus dorsi', 'middle back', 'lower back', 'trapezius', 'rhomboids'].includes(
              m.toLowerCase()
            )
          )
      );
    } else if (selectedTab === 'chest') {
      result = result.filter(
        (e) =>
          e.body_part === 'chest' ||
          e.primary_muscles.some((m) =>
            ['chest', 'pectorals', 'pectoralis major'].includes(m.toLowerCase())
          )
      );
    } else if (selectedTab === 'shoulders') {
      result = result.filter(
        (e) =>
          e.body_part === 'shoulders' ||
          e.primary_muscles.some((m) =>
            ['shoulders', 'deltoids', 'anterior deltoid', 'lateral deltoid', 'posterior deltoid'].includes(
              m.toLowerCase()
            )
          )
      );
    } else if (selectedTab === 'arms') {
      result = result.filter(
        (e) =>
          e.body_part === 'upper_arms' ||
          e.body_part === 'forearms' ||
          e.primary_muscles.some((m) =>
            ['biceps', 'triceps', 'forearms', 'brachialis'].includes(m.toLowerCase())
          )
      );
    } else if (selectedTab === 'legs') {
      result = result.filter(
        (e) =>
          e.body_part === 'upper_legs' ||
          e.body_part === 'lower_legs' ||
          e.primary_muscles.some((m) =>
            ['quadriceps', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors'].includes(
              m.toLowerCase()
            )
          )
      );
    } else if (selectedTab === 'core') {
      result = result.filter(
        (e) =>
          e.body_part === 'waist' ||
          e.primary_muscles.some((m) =>
            ['abs', 'abdominals', 'obliques', 'rectus abdominis', 'core'].includes(m.toLowerCase())
          )
      );
    }

    // 2. Query search
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((e) => {
        const nameMatch = e.name_en.toLowerCase().includes(q);
        const muscleMatch = e.primary_muscles.some((m) => m.toLowerCase().includes(q));
        const equipMatch = e.equipment?.toLowerCase().includes(q);
        const bodyPartMatch = e.body_part?.toLowerCase().includes(q);
        return nameMatch || muscleMatch || equipMatch || bodyPartMatch;
      });
    }

    return result;
  }, [selectedTab, searchQuery]);

  const handleSelect = (item: RepDBExercise) => {
    onSelectExercise(item);
    onClose();
  };

  const isSwapping = Boolean(swapTargetExercise);

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={isSwapping ? 'SWAP EXERCISE' : 'ADD EXERCISE FROM REPDB'}
      icon={isSwapping ? RefreshCw : Dumbbell}
      iconColor={modeColors.accent}
      height="88%"
    >
      <View style={styles.container}>
        {/* Header subtitle / context */}
        <View style={styles.subHeaderBox}>
          {isSwapping ? (
            <Text style={styles.subHeaderText}>
              Replacing <Text style={{ color: modeColors.accent, fontWeight: '700' }}>{swapTargetExercise?.name}</Text> with a movement from the RepDB science library.
            </Text>
          ) : (
            <Text style={styles.subHeaderText}>
              Select any exercise from RepDB (643 movements with verified CDN preview poses) to add to today's workout.
            </Text>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search e.g. Pull-up, Squat, Push-up, Dips..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Suggestion Chips */}
        <View style={styles.quickSuggestionsRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={POPULAR_SUGGESTIONS}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.quickSuggestionsContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery(item);
                  setSelectedTab('all');
                }}
                style={[
                  styles.quickChip,
                  searchQuery.toLowerCase() === item.toLowerCase() && {
                    borderColor: modeColors.accent,
                    backgroundColor: `${modeColors.accent}20`,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    searchQuery.toLowerCase() === item.toLowerCase() && {
                      color: modeColors.accent,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Category Tabs */}
        <View style={styles.tabsRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORY_TABS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tabsContent}
            renderItem={({ item }) => {
              const isSelected = selectedTab === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedTab(item.id)}
                  style={[
                    styles.tabButton,
                    isSelected && [
                      styles.tabButtonActive,
                      { borderColor: modeColors.accent, backgroundColor: `${modeColors.accent}15` },
                    ],
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isSelected && [styles.tabTextActive, { color: modeColors.accent }],
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Results Counter */}
        <View style={styles.resultsInfoRow}>
          <Text style={styles.resultsCountText}>
            SHOWING <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>{filteredExercises.length}</Text> EXERCISES
          </Text>
          <Text style={styles.repDbTag}>RepDB • 643 movements</Text>
        </View>

        {/* Exercises FlatList */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Dumbbell size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No exercises matched</Text>
              <Text style={styles.emptySubText}>
                Try adjusting your search query or switching category tabs.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const imagesFlat = item.images?.flat;
            const thumbUrl = getRepDBImageUrl(
              imagesFlat?.peak || imagesFlat?.main || imagesFlat?.start
            );
            const firstMuscle = item.primary_muscles?.[0];
            const isTarget = swapTargetExercise?.id === item.id;

            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={[
                  styles.exerciseRow,
                  isTarget && { borderColor: `${modeColors.accent}60`, backgroundColor: `${modeColors.accent}10` },
                ]}
                activeOpacity={0.75}
              >
                {/* Thumbnail */}
                <View style={styles.thumbnailWrapper}>
                  {thumbUrl ? (
                    <Image
                      source={{ uri: thumbUrl }}
                      style={styles.thumbnailImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Dumbbell size={18} color={COLORS.textMuted} />
                  )}
                </View>

                {/* Details */}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name_en}
                  </Text>

                  {/* Badges: Muscle, Equipment, Difficulty */}
                  <View style={styles.itemBadgesRow}>
                    {firstMuscle && (
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>
                          {formatBadgeText(firstMuscle)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>
                        {formatBadgeText(item.equipment || (item.is_bodyweight ? 'bodyweight' : 'equipment'))}
                      </Text>
                    </View>

                    {item.difficulty && (
                      <View
                        style={[
                          styles.itemBadge,
                          item.difficulty === 'beginner' && styles.badgeBeginner,
                          item.difficulty === 'intermediate' && styles.badgeIntermediate,
                          item.difficulty === 'advanced' && styles.badgeAdvanced,
                        ]}
                      >
                        <Text
                          style={[
                            styles.itemBadgeText,
                            item.difficulty === 'beginner' && { color: COLORS.success },
                            item.difficulty === 'intermediate' && { color: modeColors.accent },
                            item.difficulty === 'advanced' && { color: COLORS.strict.accent },
                          ]}
                        >
                          {item.difficulty.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action button */}
                <View
                  style={[
                    styles.selectBtn,
                    {
                      borderColor: isSwapping ? `${COLORS.warning}60` : `${modeColors.accent}60`,
                      backgroundColor: isSwapping ? 'rgba(245, 158, 11, 0.15)' : `${modeColors.accent}15`,
                    },
                  ]}
                >
                  {isSwapping ? (
                    <>
                      <RefreshCw size={11} color={COLORS.warning} />
                      <Text style={[styles.selectBtnText, { color: COLORS.warning }]}>Swap</Text>
                    </>
                  ) : (
                    <>
                      <Plus size={13} color={modeColors.accent} />
                      <Text style={[styles.selectBtnText, { color: modeColors.accent }]}>Add</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: SPACING.xs,
  },
  subHeaderBox: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  subHeaderText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 9,
  },
  searchInput: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    padding: 0,
  },
  quickSuggestionsRow: {
    marginTop: 2,
  },
  quickSuggestionsContent: {
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  quickChipText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  tabsRow: {
    marginTop: 2,
  },
  tabsContent: {
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  tabButtonActive: {
    borderColor: COLORS.strict.accent,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  resultsCountText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  repDbTag: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingBottom: 24,
    marginTop: 4,
  },
  separator: {
    height: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.xs + 2,
  },
  thumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xs,
    backgroundColor: '#090D14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    gap: 3,
  },
  itemName: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  itemBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  itemBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  badgeBeginner: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  badgeIntermediate: {
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  badgeAdvanced: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  selectBtnText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  emptySubText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
});
