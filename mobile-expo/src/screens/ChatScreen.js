import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import { COLORS } from '../theme';

const getCategoryIcon = (category) => {
  switch ((category || '').toLowerCase()) {
    case 'food':
      return 'fast-food-outline';
    case 'transport':
      return 'car-outline';
    case 'utilities':
      return 'flash-outline';
    case 'shopping':
      return 'bag-handle-outline';
    case 'entertainment':
      return 'film-outline';
    case 'subscriptions':
      return 'repeat-outline';
    case 'health':
      return 'heart-outline';
    case 'income':
      return 'wallet-outline';
    case 'transfer':
      return 'swap-horizontal-outline';
    default:
      return 'receipt-outline';
  }
};

export default function ChatScreen() {
  const { user } = useAuth();
  const { t, getCategoryName, language, toggleLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [activeTab, setActiveTab] = useState('transaction'); // 'transaction' | 'chat'
  const [chatInput, setChatInput] = useState('');
  const [txnInput, setTxnInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);

  const [chatHistory, setChatHistory] = useState([
    { sender: 'bot', text: t('chat.welcome_chat') },
  ]);
  const [txnHistory, setTxnHistory] = useState([
    { sender: 'bot', text: t('chat.welcome_txn') },
  ]);

  // Load persisted histories per user
  useEffect(() => {
    if (!user?.user_id) return;
    const loadHistories = async () => {
      try {
        const [savedChat, savedTxn] = await AsyncStorage.multiGet([
          `chat_history_${user.user_id}`,
          `chat_txn_history_${user.user_id}`,
        ]);
        if (savedChat[1]) setChatHistory(JSON.parse(savedChat[1]));
        if (savedTxn[1]) setTxnHistory(JSON.parse(savedTxn[1]));
      } catch {
        // Ignore storage errors
      }
    };
    loadHistories();
  }, [user]);

  useEffect(() => {
    if (user?.user_id) {
      AsyncStorage.setItem(`chat_history_${user.user_id}`, JSON.stringify(chatHistory)).catch(() => {});
    }
  }, [chatHistory, user]);

  useEffect(() => {
    if (user?.user_id) {
      AsyncStorage.setItem(`chat_txn_history_${user.user_id}`, JSON.stringify(txnHistory)).catch(() => {});
    }
  }, [txnHistory, user]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [chatHistory, txnHistory, activeTab, chatLoading, txnLoading]);

  const sendMessage = async (overrideMsg = null) => {
    if (activeTab === 'chat') {
      const msg = (typeof overrideMsg === 'string' ? overrideMsg : chatInput).trim();
      if (!msg || chatLoading) return;
      setChatHistory((prev) => [...prev, { sender: 'user', text: msg }]);
      if (typeof overrideMsg !== 'string') setChatInput('');
      setChatLoading(true);

      try {
        const historyPayload = [];
        for (const h of chatHistory) {
          if (historyPayload.length === 0 && h.sender === 'bot') continue;
          historyPayload.push({
            role: h.sender === 'user' ? 'user' : 'assistant',
            content: h.text,
          });
        }
        const res = await api.post('/chat', { message: msg, history: historyPayload });
        setChatHistory((prev) => [...prev, { sender: 'bot', text: res.data.reply }]);
      } catch {
        setChatHistory((prev) => [...prev, { sender: 'bot', text: t('chat.error_connect') }]);
      } finally {
        setChatLoading(false);
      }
    } else {
      const msg = txnInput.trim();
      if (!msg || txnLoading) return;
      setTxnHistory((prev) => [...prev, { sender: 'user', text: msg }]);
      setTxnInput('');
      setTxnLoading(true);

      try {
        const res = await api.post('/chat/transaction', { message: msg });
        const st = res.data.status;
        if (st === 'saved' || st === 'updated' || st === 'deleted') {
          setTxnHistory((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: res.data.message || '',
              status: st,
              transaction: res.data.transaction,
              previous: res.data.previous || null,
            },
          ]);
        } else if (st === 'ambiguous') {
          setTxnHistory((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: res.data.detail || '',
              status: 'ambiguous',
              action: res.data.action,
              candidates: res.data.candidates || [],
              updates: res.data.updates || null,
            },
          ]);
        } else {
          setTxnHistory((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: res.data.detail || t('chat.error_parse'),
              status: 'error',
            },
          ]);
        }
      } catch {
        setTxnHistory((prev) => [
          ...prev,
          { sender: 'bot', text: t('chat.error_connect'), status: 'error' },
        ]);
      } finally {
        setTxnLoading(false);
      }
    }
  };

  const handleResolveAmbiguous = async (msgIndex, candidate, action, updates) => {
    try {
      if (action === 'delete') {
        await api.delete(`/transactions/${encodeURIComponent(candidate.id)}`);
        setTxnHistory((prev) =>
          prev.map((m, idx) =>
            idx === msgIndex
              ? { sender: 'bot', status: 'deleted', transaction: candidate, text: '' }
              : m
          )
        );
      } else if (action === 'edit' && updates) {
        const res = await api.put(`/transactions/${encodeURIComponent(candidate.id)}`, updates);
        setTxnHistory((prev) =>
          prev.map((m, idx) =>
            idx === msgIndex
              ? {
                  sender: 'bot',
                  status: 'updated',
                  transaction: res.data.transaction || { ...candidate, ...updates },
                  previous: candidate,
                  text: '',
                }
              : m
          )
        );
      }
    } catch {
      setTxnHistory((prev) => [
        ...prev,
        { sender: 'bot', text: t('chat.error_connect'), status: 'error' },
      ]);
    }
  };

  const clearHistory = () => {
    const isChat = activeTab === 'chat';
    Alert.alert(
      'Xác nhận',
      isChat ? t('chat.confirm_clear_chat') : t('chat.confirm_clear_txn'),
      [
        { text: t('txn.cancel'), style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (isChat) {
              setChatHistory([{ sender: 'bot', text: t('chat.welcome_chat') }]);
              if (user?.user_id) {
                await AsyncStorage.removeItem(`chat_history_${user.user_id}`);
              }
            } else {
              setTxnHistory([{ sender: 'bot', text: t('chat.welcome_txn') }]);
              if (user?.user_id) {
                await AsyncStorage.removeItem(`chat_txn_history_${user.user_id}`);
              }
            }
          },
        },
      ]
    );
  };

  const currentHistory = activeTab === 'chat' ? chatHistory : txnHistory;
  const currentLoading = activeTab === 'chat' ? chatLoading : txnLoading;
  const currentInputValue = activeTab === 'chat' ? chatInput : txnInput;
  const setCurrentInput = activeTab === 'chat' ? setChatInput : setTxnInput;

  const bottomPadding = Math.max(insets.bottom, 12) + 74;

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.inner, { paddingBottom: bottomPadding }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="hardware-chip-outline" size={22} color={COLORS.primary} />
                <Text style={styles.title}>{t('chat.title')}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={toggleLanguage}>
                  <Text style={styles.langText}>{language.toUpperCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={clearHistory}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabGroup}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'transaction' && styles.tabBtnActive]}
                onPress={() => setActiveTab('transaction')}
              >
                <Ionicons
                  name="receipt-outline"
                  size={15}
                  color={activeTab === 'transaction' ? '#fff' : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'transaction' && styles.tabBtnTextActive,
                  ]}
                >
                  {t('chat.tab_transaction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
                onPress={() => setActiveTab('chat')}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={15}
                  color={activeTab === 'chat' ? '#fff' : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === 'chat' && styles.tabBtnTextActive,
                  ]}
                >
                  {t('chat.tab_chat')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.descText}>
              {activeTab === 'chat' ? t('chat.chat_desc') : t('chat.txn_desc')}
            </Text>

            {/* Chat Messages */}
            <View style={styles.chatBox}>
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.chatScroll}
                showsVerticalScrollIndicator={false}
              >
                {currentHistory.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.botBubble,
                      ]}
                    >
                      {!isUser && (
                        <View style={styles.botHeader}>
                          <View style={styles.botAvatar}>
                            <Ionicons name="sparkles" size={12} color={COLORS.primary} />
                          </View>
                          <Text style={styles.botName}>BudgetBot AI</Text>
                        </View>
                      )}

                      {isUser ? (
                        <Text style={styles.userText}>{msg.text}</Text>
                      ) : msg.status === 'error' ? (
                        <View style={styles.errorRow}>
                          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                          <Text style={styles.errorText}>{msg.text}</Text>
                        </View>
                      ) : ['saved', 'updated', 'deleted'].includes(msg.status) && msg.transaction ? (
                        (() => {
                          const isDeleted = msg.status === 'deleted';
                          const isUpdated = msg.status === 'updated';
                          const accentColor = isDeleted
                            ? COLORS.error
                            : isUpdated
                            ? COLORS.primary
                            : COLORS.success;
                          const headerTitle = isDeleted
                            ? t('chat.card_deleted')
                            : isUpdated
                            ? t('chat.card_updated')
                            : t('chat.card_saved');
                          const conf = (msg.transaction.confidence || 'high').toLowerCase();
                          const confStyle =
                            conf === 'high'
                              ? { bg: 'rgba(16, 185, 129, 0.12)', color: COLORS.success, label: t('chat.high_conf') }
                              : conf === 'medium'
                              ? { bg: 'rgba(245, 158, 11, 0.14)', color: COLORS.warn, label: t('chat.med_conf') }
                              : { bg: 'rgba(239, 68, 68, 0.12)', color: COLORS.error, label: t('chat.low_conf') };

                          return (
                            <View style={styles.txnCard}>
                              <View style={[styles.txnAccentBar, { backgroundColor: accentColor }]} />
                              <View style={styles.txnCardHeader}>
                                <Text style={[styles.txnCardTitle, { color: accentColor }]}>
                                  {headerTitle}
                                </Text>
                                {!isDeleted && (
                                  <View style={[styles.confPill, { backgroundColor: confStyle.bg }]}>
                                    <Text style={[styles.confPillText, { color: confStyle.color }]}>
                                      {confStyle.label}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.txnCardRow}>
                                <Text style={styles.txnCardLabel}>{t('chat.card_desc')}</Text>
                                <Text
                                  style={[
                                    styles.txnCardVal,
                                    isDeleted && { textDecorationLine: 'line-through' },
                                  ]}
                                >
                                  {msg.transaction.description}
                                </Text>
                              </View>

                              <View style={styles.txnCardRow}>
                                <Text style={styles.txnCardLabel}>{t('chat.card_date')}</Text>
                                <Text style={styles.txnCardVal}>{msg.transaction.date}</Text>
                              </View>

                              <View style={styles.txnCardRow}>
                                <Text style={styles.txnCardLabel}>{t('chat.card_cat')}</Text>
                                <View style={styles.catPill}>
                                  <Ionicons
                                    name={getCategoryIcon(msg.transaction.category)}
                                    size={12}
                                    color={COLORS.primaryDark}
                                  />
                                  <Text style={styles.catPillText}>
                                    {getCategoryName(msg.transaction.category)}
                                  </Text>
                                </View>
                              </View>

                              <View style={[styles.txnCardRow, styles.txnAmtRow]}>
                                <Text style={styles.txnCardLabel}>{t('chat.card_amt')}</Text>
                                <Text
                                  style={[
                                    styles.txnAmtVal,
                                    {
                                      color: isDeleted
                                        ? '#94a3b8'
                                        : msg.transaction.amount >= 0
                                        ? COLORS.success
                                        : COLORS.error,
                                      textDecorationLine: isDeleted ? 'line-through' : 'none',
                                    },
                                  ]}
                                >
                                  {msg.transaction.amount >= 0 ? '+' : '-'}
                                  {formatCurrency(Math.abs(msg.transaction.amount))}
                                </Text>
                              </View>
                            </View>
                          );
                        })()
                      ) : msg.status === 'ambiguous' && msg.candidates ? (
                        <View style={{ gap: 8 }}>
                          <Text style={{ fontWeight: '700', color: COLORS.warn, fontSize: 13 }}>
                            {msg.text}
                          </Text>
                          {msg.candidates.map((cand) => (
                            <View key={String(cand.id)} style={styles.candRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.candDesc}>{cand.description}</Text>
                                <Text style={styles.candSub}>
                                  {cand.date} • {getCategoryName(cand.category)} •{' '}
                                  {cand.amount >= 0 ? '+' : '-'}
                                  {formatCurrency(Math.abs(cand.amount))}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.candBtn,
                                  {
                                    backgroundColor:
                                      msg.action === 'delete'
                                        ? '#fee2e2'
                                        : 'rgba(37, 99, 235, 0.12)',
                                  },
                                ]}
                                onPress={() =>
                                  handleResolveAmbiguous(idx, cand, msg.action, msg.updates)
                                }
                              >
                                <Text
                                  style={[
                                    styles.candBtnText,
                                    {
                                      color:
                                        msg.action === 'delete' ? COLORS.error : COLORS.primary,
                                    },
                                  ]}
                                >
                                  {msg.action === 'delete'
                                    ? language === 'vi'
                                      ? 'Xóa'
                                      : 'Delete'
                                    : language === 'vi'
                                    ? 'Cập nhật'
                                    : 'Update'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Markdown style={markdownStyles}>
                          {msg.text || ''}
                        </Markdown>
                      )}
                    </View>
                  );
                })}

                {currentLoading && (
                  <View style={[styles.bubble, styles.botBubble, styles.loadingBubble]}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>{t('chat.analyzing')}</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Quick suggestion chips on Ask AI tab */}
            {activeTab === 'chat' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickScroll}
                contentContainerStyle={styles.quickWrap}
              >
                {[
                  t('chat.quick_q1'),
                  t('chat.quick_q2'),
                  t('chat.quick_q3'),
                  t('chat.quick_q4'),
                ].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickChip}
                    disabled={currentLoading}
                    onPress={() => sendMessage(q)}
                  >
                    <Ionicons name="sparkles-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.quickText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Input Bar */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={currentInputValue}
                onChangeText={setCurrentInput}
                placeholder={
                  activeTab === 'chat' ? t('chat.chat_placeholder') : t('chat.txn_placeholder')
                }
                placeholderTextColor={COLORS.textMuted}
                editable={!currentLoading}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, currentLoading && { opacity: 0.6 }]}
                onPress={() => sendMessage()}
                disabled={currentLoading}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const markdownStyles = {
  body: { color: COLORS.textMain, fontSize: 14, lineHeight: 20 },
  heading3: { color: COLORS.primaryDark, fontSize: 15, fontWeight: '700', marginVertical: 4 },
  strong: { fontWeight: '700' },
  code_inline: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    color: COLORS.primaryDark,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 18,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    flex: 0,
    width: '100%',
  },
  thead: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    flex: 0,
  },
  th: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  td: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 11,
    color: COLORS.textMain,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: COLORS.glassCard,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  langText: { fontWeight: '700', fontSize: 12, color: COLORS.primaryDark },

  tabGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: '#fff', fontWeight: '700' },
  descText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },

  chatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 10,
    marginBottom: 8,
  },
  chatScroll: { gap: 12, paddingBottom: 24 },
  bubble: {
    maxWidth: '90%',
    borderRadius: 16,
    padding: 12,
    flexShrink: 0,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
    paddingBottom: 18,
  },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  botAvatar: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botName: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  userText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '500', flexShrink: 1 },
  loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: COLORS.textMuted },

  txnCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    overflow: 'hidden',
    gap: 6,
    minWidth: 230,
  },
  txnAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  txnCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  txnCardTitle: { fontSize: 13, fontWeight: '800' },
  confPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  confPillText: { fontSize: 10, fontWeight: '700' },
  txnCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  txnCardLabel: { fontSize: 12, color: COLORS.textMuted },
  txnCardVal: { fontSize: 13, fontWeight: '700', color: COLORS.textMain, flexShrink: 1, textAlign: 'right' },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catPillText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },
  txnAmtRow: {
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  txnAmtVal: { fontSize: 15, fontWeight: '800' },

  candRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  candDesc: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  candSub: { fontSize: 11, color: COLORS.textMuted },
  candBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  candBtnText: { fontSize: 12, fontWeight: '700' },

  quickScroll: { maxHeight: 36, marginBottom: 8 },
  quickWrap: { gap: 6, alignItems: 'center' },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickText: { fontSize: 12, fontWeight: '600', color: COLORS.primaryDark },

  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textMain,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
