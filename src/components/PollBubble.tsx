import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pollAPI } from '../services/pollApi';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  votedByMe: boolean;
}

interface PollData {
  id: string;
  question: string;
  allowMultiple: boolean;
  isClosed: boolean;
  totalVotes: number;
  createdAt?: string;
  createdBy?: { id: string; name: string; avatarUrl?: string };
  options: PollOption[];
}

interface PollBubbleProps {
  poll: PollData;
  isMine: boolean;
  currentUserId?: string | null;
  onUpdated?: (poll: PollData) => void;
}

const PURPLE = '#7C3AED';
const INDIGO = '#6366F1';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POLL_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 300);

const PollBubble: React.FC<PollBubbleProps> = ({ poll, isMine, currentUserId, onUpdated }) => {
  const [local, setLocal] = useState<PollData>(poll);
  const [busy, setBusy] = useState(false);

  // Re-sync when parent passes a newer reference (e.g. socket update).
  useEffect(() => {
    if (poll && poll !== local) setLocal(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll]);

  const total = local.totalVotes || 0;
  const leadingCount = Math.max(0, ...local.options.map((o) => o.voteCount ?? 0));

  const handleVote = async (optionId: string) => {
    if (busy || local.isClosed) return;

    const wasSelected = local.options.find((o) => o.id === optionId)?.votedByMe;
    let nextSelected: string[];

    if (local.allowMultiple) {
      const currentlySelected = local.options.filter((o) => o.votedByMe).map((o) => o.id);
      nextSelected = wasSelected
        ? currentlySelected.filter((id) => id !== optionId)
        : [...currentlySelected, optionId];
    } else {
      nextSelected = wasSelected ? [] : [optionId];
    }

    // Optimistic update
    setLocal((prev) => {
      const prevSet = new Set(prev.options.filter((o) => o.votedByMe).map((o) => o.id));
      const nextSet = new Set(nextSelected);
      const options = prev.options.map((o) => {
        const wasMine = prevSet.has(o.id);
        const isMineNow = nextSet.has(o.id);
        let delta = 0;
        if (wasMine && !isMineNow) delta = -1;
        else if (!wasMine && isMineNow) delta = 1;
        return { ...o, votedByMe: isMineNow, voteCount: (o.voteCount ?? 0) + delta };
      });
      const totalVotes = options.reduce((s, o) => s + (o.voteCount ?? 0), 0);
      return { ...prev, options, totalVotes };
    });

    setBusy(true);
    try {
      const fresh =
        nextSelected.length === 0
          ? await pollAPI.unvote(local.id)
          : await pollAPI.vote(local.id, nextSelected);
      if (fresh) {
        setLocal(fresh);
        onUpdated?.(fresh);
      }
    } catch {
      // Revert on error — re-fetch
      try {
        const fresh = await pollAPI.get(local.id);
        if (fresh) setLocal(fresh);
      } catch {}
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const fresh = await pollAPI.close(local.id);
      if (fresh) {
        setLocal(fresh);
        onUpdated?.(fresh);
      }
    } finally {
      setBusy(false);
    }
  };

  const canClose = !local.isClosed && local.createdBy?.id === currentUserId;

  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
      {/* Header */}
      <View style={[styles.header, isMine ? styles.headerBorderMine : styles.headerBorderOther]}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Ionicons name="bar-chart" size={16} color="white" />
          </View>
          <View style={styles.headerTextWrap}>
            <View style={styles.badgeRow}>
              <Text style={styles.labelText}>BÌNH CHỌN</Text>
              {local.isClosed && (
                <View style={styles.closedBadge}>
                  <Ionicons name="lock-closed" size={10} color="#6B7280" />
                  <Text style={styles.closedBadgeText}> Đã đóng</Text>
                </View>
              )}
              {!local.isClosed && local.allowMultiple && (
                <View style={styles.multipleBadge}>
                  <Text style={styles.multipleBadgeText}>Nhiều lựa chọn</Text>
                </View>
              )}
            </View>
            <Text style={styles.questionText}>{local.question}</Text>
          </View>
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {local.options.map((opt) => {
          const count = opt.voteCount ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const isLeading = total > 0 && count > 0 && count === leadingCount;
          const isVoted = opt.votedByMe;
          const disabled = local.isClosed || busy;

          return (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={disabled ? 1 : 0.7}
              onPress={() => !disabled && handleVote(opt.id)}
              style={[
                styles.optionButton,
                isVoted ? styles.optionVoted : styles.optionDefault,
                disabled && styles.optionDisabled,
              ]}
            >
              {/* Progress fill */}
              <View
                style={[
                  styles.progressFill,
                  isVoted
                    ? styles.progressVoted
                    : isLeading
                      ? styles.progressLeading
                      : styles.progressNormal,
                  { width: `${pct}%` as any },
                ]}
              />
              <View style={styles.optionContent}>
                {/* Checkbox/radio indicator */}
                <View
                  style={[
                    styles.checkCircle,
                    isVoted ? styles.checkCircleVoted : styles.checkCircleDefault,
                  ]}
                >
                  {isVoted && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <Text
                  style={[styles.optionText, isVoted && styles.optionTextVoted]}
                  numberOfLines={2}
                >
                  {opt.text}
                </Text>
                <Text
                  style={[styles.pctText, isVoted ? styles.pctTextVoted : styles.pctTextDefault]}
                >
                  {Math.round(pct)}%
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={[styles.footer, isMine ? styles.headerBorderMine : styles.headerBorderOther]}>
        <View style={styles.footerLeft}>
          <Ionicons name="people" size={14} color="#6B7280" />
          <Text style={styles.footerText}> {total} lượt vote</Text>
        </View>
        {canClose ? (
          <TouchableOpacity onPress={handleClose} disabled={busy}>
            <Text style={styles.closeText}>Đóng bình chọn</Text>
          </TouchableOpacity>
        ) : local.createdBy?.name ? (
          <Text style={styles.creatorText} numberOfLines={1}>
            bởi {local.createdBy.name}
          </Text>
        ) : null}
      </View>

      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="small" color={PURPLE} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: POLL_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  containerMine: {
    backgroundColor: '#F5F3FF',
    borderColor: '#E5E7EB',
  },
  containerOther: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },

  // Header
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerBorderMine: { borderBottomColor: '#E5E7EB' },
  headerBorderOther: { borderBottomColor: '#F3F4F6' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  closedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
  },
  multipleBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  multipleBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: PURPLE,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },

  // Options
  optionsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  optionButton: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionVoted: {
    borderColor: INDIGO,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  optionDefault: {
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  optionDisabled: {
    opacity: 0.8,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  progressVoted: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  progressLeading: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  progressNormal: {
    backgroundColor: 'rgba(107, 114, 128, 0.06)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleVoted: {
    borderColor: INDIGO,
    backgroundColor: INDIGO,
  },
  checkCircleDefault: {
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  optionTextVoted: {
    fontWeight: '600',
    color: '#111827',
  },
  pctText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pctTextVoted: {
    color: INDIGO,
  },
  pctTextDefault: {
    color: '#9CA3AF',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  creatorText: {
    fontSize: 11,
    color: '#9CA3AF',
    maxWidth: 140,
  },

  // Busy overlay
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PollBubble;
