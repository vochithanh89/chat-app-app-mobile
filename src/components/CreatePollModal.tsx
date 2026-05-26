import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pollAPI } from '../services/pollApi';

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  onCreated?: (data: any) => void;
}

const ZALO_BLUE = '#0068FF';
const PURPLE = '#7C3AED';

const CreatePollModal: React.FC<CreatePollModalProps> = ({
  visible,
  onClose,
  conversationId,
  onCreated,
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuestion('');
    setOptions(['', '']);
    setAllowMultiple(false);
    setError('');
  }, [visible]);

  const updateOption = (idx: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 20) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError('');
    const trimmedQ = question.trim();
    const trimmedOpts = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!trimmedQ) {
      setError('Hãy nhập câu hỏi.');
      return;
    }
    if (trimmedOpts.length < 2) {
      setError('Cần ít nhất 2 lựa chọn.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await pollAPI.create(conversationId, {
        question: trimmedQ,
        options: trimmedOpts,
        allowMultiple,
      });
      onCreated?.(data);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Tạo bình chọn thất bại.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerIconBox}>
                <Ionicons name="bar-chart" size={18} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Tạo bình chọn</Text>
                <Text style={styles.sheetDesc}>
                  Gửi một câu hỏi cho nhóm và để mọi người vote.
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.scrollBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Question */}
              <Text style={styles.label}>Câu hỏi</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Ăn gì trưa nay?"
                placeholderTextColor="#9CA3AF"
                value={question}
                onChangeText={setQuestion}
                maxLength={500}
                multiline
              />

              {/* Options */}
              <Text style={[styles.label, { marginTop: 16 }]}>Lựa chọn</Text>
              {options.map((opt, idx) => (
                <View key={idx} style={styles.optionRow}>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    placeholderTextColor="#9CA3AF"
                    value={opt}
                    onChangeText={(v) => updateOption(idx, v)}
                    maxLength={300}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeOption(idx)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {options.length < 20 && (
                <TouchableOpacity style={styles.addBtn} onPress={addOption}>
                  <Ionicons name="add-circle-outline" size={20} color={PURPLE} />
                  <Text style={styles.addBtnText}>Thêm lựa chọn</Text>
                </TouchableOpacity>
              )}

              {/* Allow Multiple */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Cho phép chọn nhiều đáp án</Text>
                <Switch
                  value={allowMultiple}
                  onValueChange={setAllowMultiple}
                  trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                  thumbColor={allowMultiple ? PURPLE : '#F3F4F6'}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="bar-chart" size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.submitText}>Tạo bình chọn</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },

  // Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sheetDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },

  // Body
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: PURPLE,
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});

export default CreatePollModal;
