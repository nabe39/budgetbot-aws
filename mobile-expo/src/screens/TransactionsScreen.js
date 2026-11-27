import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import GlassCard from '../components/GlassCard';
import DatePickerModal from '../components/DatePickerModal';
import { COLORS } from '../theme';

const STANDARD_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Income',
  'Transfer',
  'Other',
];

export default function TransactionsScreen() {
  const { t, getCategoryName, getConfidenceLabel, language, toggleLanguage } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Pagination
  const [selectedDate, setSelectedDate] = useState('');
  const [category, setCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Picker modals
  const [catFilterOpen, setCatFilterOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const [formDateOpen, setFormDateOpen] = useState(false);

  // Add / Edit modal state
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Food',
    type: 'out',
    confidence: 'high',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate.trim()) {
        params.date = selectedDate.trim();
        params.month = selectedDate.trim();
      }
      if (category) params.category = category;
      const res = await api.get('/transactions', { params });
      setTransactions(res.data.transactions || []);
      setCurrentPage(1);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, category]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '')
    );
  }, [transactions]);

  const summaryStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const item of transactions) {
      const amt = Number(item.amount) || 0;
      if (amt >= 0) totalIn += amt;
      else totalOut += Math.abs(amt);
    }
    return {
      count: transactions.length,
      income: totalIn,
      expense: totalOut,
      net: totalIn - totalOut,
    };
  }, [transactions]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / itemsPerPage));
  const currentTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(start, start + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const openAddModal = () => {
    setEditingId(null);
    setFormState({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'Food',
      type: 'out',
      confidence: 'high',
    });
    setFormVisible(true);
  };

  const openEditModal = (txn) => {
    const amt = Number(txn.amount) || 0;
    setEditingId(txn.id);
    setFormState({
      date: txn.date || new Date().toISOString().split('T')[0],
      description: txn.description || '',
      amount: String(Math.abs(amt)),
      category: txn.category || 'Other',
      type: amt >= 0 ? 'in' : 'out',
      confidence: txn.confidence || 'high',
    });
    setFormVisible(true);
  };

  const handleSaveForm = async () => {
    const num = parseFloat(formState.amount);
    if (!formState.description.trim() || Number.isNaN(num) || num <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả và số tiền hợp lệ.');
      return;
    }
    const finalAmount = formState.type === 'out' ? -Math.abs(num) : Math.abs(num);

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/transactions/${encodeURIComponent(editingId)}`, {
          date: formState.date,
          description: formState.description.trim(),
          amount: finalAmount,
          category: formState.category,
          confidence: formState.confidence || 'high',
        });
      } else {
        await api.post('/transactions', {
          date: formState.date,
          description: formState.description.trim(),
          amount: finalAmount,
          category: formState.category || 'Food',
          confidence: 'high',
        });
      }
      setFormVisible(false);
      fetchTransactions();
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (txn) => {
    Alert.alert('Xác nhận xóa', t('txn.delete_confirm'), [
      { text: t('txn.cancel'), style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/transactions/${encodeURIComponent(txn.id)}`);
            fetchTransactions();
          } catch (err) {
            Alert.alert('Lỗi', err.response?.data?.detail || err.message);
          }
        },
      },
    ]);
  };

  const getConfidenceStyle = (conf) => {
    const c = (conf || '').toLowerCase();
    if (c === 'high') {
      return { bg: 'rgba(5, 150, 105, 0.14)', color: COLORS.success, icon: 'checkmark-circle' };
    }
    if (c === 'medium') {
      return { bg: 'rgba(217, 119, 6, 0.14)', color: COLORS.warn, icon: 'warning' };
    }
    if (c === 'low') {
      return { bg: 'rgba(220, 38, 38, 0.14)', color: COLORS.error, icon: 'alert-circle' };
    }
    return { bg: 'rgba(100, 116, 139, 0.14)', color: COLORS.textMuted, icon: 'help-circle' };
  };

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTransactions} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('txn.title')}</Text>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* 4 KPI Cards giống hệt Web */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('txn.total_txns')}</Text>
              <Text style={[styles.kpiVal, { color: COLORS.textMain }]}>
                {summaryStats.count}
              </Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('txn.total_income')}</Text>
              <Text style={[styles.kpiVal, { color: COLORS.success }]}>
                +{formatCurrency(summaryStats.income)}
              </Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('txn.total_expense')}</Text>
              <Text style={[styles.kpiVal, { color: COLORS.error }]}>
                -{formatCurrency(summaryStats.expense)}
              </Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('txn.net_balance')}</Text>
              <Text
                style={[
                  styles.kpiVal,
                  { color: summaryStats.net >= 0 ? COLORS.success : COLORS.error },
                ]}
              >
                {summaryStats.net >= 0 ? '+' : '-'}
                {formatCurrency(Math.abs(summaryStats.net))}
              </Text>
            </View>
          </View>

          {/* Main Card */}
          <GlassCard>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="list" size={18} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>{t('txn.title')}</Text>
                </View>
                <Text style={styles.cardSubtitle}>{t('txn.subtitle')}</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{t('txn.add_btn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Bar */}
            <View style={styles.filterBox}>
              <TouchableOpacity
                style={styles.filterRow}
                onPress={() => setFilterDateOpen(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text
                  style={[
                    styles.datePickerText,
                    !selectedDate && { color: COLORS.textMuted },
                  ]}
                >
                  {selectedDate
                    ? `${selectedDate.split('-').reverse().join('/')}`
                    : language === 'vi'
                    ? 'Chọn lịch: dd/mm/yyyy'
                    : 'Pick date: mm/dd/yyyy'}
                </Text>
                {selectedDate ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedDate('');
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="calendar-clear-outline" size={16} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>

              <View style={styles.filterActionRow}>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => setCatFilterOpen(true)}
                >
                  <Ionicons name="pricetag-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.selectText} numberOfLines={1}>
                    {category ? getCategoryName(category) : t('txn.all_categories')}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pageSizeBtn}
                  onPress={() => setPageSizeOpen(true)}
                >
                  <Text style={styles.selectText}>{itemsPerPage} / trang</Text>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.refreshBtn} onPress={fetchTransactions}>
                  <Ionicons name="refresh" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* List or Empty state */}
            {loading && transactions.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : currentTransactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={38} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t('txn.no_data')}</Text>
                {(selectedDate || category) && (
                  <TouchableOpacity
                    style={styles.clearFilterBtn}
                    onPress={() => {
                      setSelectedDate('');
                      setCategory('');
                    }}
                  >
                    <Text style={styles.clearFilterText}>{t('txn.clear_all')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.txnList}>
                {currentTransactions.map((item) => {
                  const amt = Number(item.amount) || 0;
                  const isIncome = amt >= 0;
                  const confStyle = getConfidenceStyle(item.confidence);

                  return (
                    <View key={String(item.id)} style={styles.txnRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.txnDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                        <View style={styles.txnMetaRow}>
                          <Text style={styles.txnDate}>{item.date}</Text>
                          <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>
                              {getCategoryName(item.category)}
                            </Text>
                          </View>
                          <View style={[styles.confBadge, { backgroundColor: confStyle.bg }]}>
                            <Ionicons name={confStyle.icon} size={11} color={confStyle.color} />
                            <Text style={[styles.confText, { color: confStyle.color }]}>
                              {getConfidenceLabel(item.confidence)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.txnRight}>
                        <Text
                          style={[
                            styles.txnAmt,
                            { color: isIncome ? COLORS.success : COLORS.error },
                          ]}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(Math.abs(amt))}
                        </Text>
                        <View style={styles.rowActions}>
                          <TouchableOpacity
                            style={styles.rowIconBtn}
                            onPress={() => openEditModal(item)}
                          >
                            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rowIconBtn}
                            onPress={() => handleDelete(item)}
                          >
                            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={styles.paginationRow}>
                    <TouchableOpacity
                      style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                      disabled={currentPage === 1}
                      onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <Text style={styles.pageBtnText}>{t('txn.prev')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageIndicator}>
                      {currentPage} / {totalPages}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pageBtn,
                        currentPage === totalPages && styles.pageBtnDisabled,
                      ]}
                      disabled={currentPage === totalPages}
                      onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <Text style={styles.pageBtnText}>{t('txn.next')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </GlassCard>
        </ScrollView>

        {/* Modal lọc danh mục */}
        <Modal
          visible={catFilterOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCatFilterOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCatFilterOpen(false)}>
            <Pressable style={styles.pickerModal} onPress={() => {}}>
              <Text style={styles.modalTitle}>{t('txn.field_category')}</Text>
              <ScrollView style={{ maxHeight: 320 }}>
                <TouchableOpacity
                  style={[styles.pickerOption, category === '' && styles.pickerOptionActive]}
                  onPress={() => {
                    setCategory('');
                    setCatFilterOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{t('txn.all_categories')}</Text>
                </TouchableOpacity>
                {STANDARD_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pickerOption, category === cat && styles.pickerOptionActive]}
                    onPress={() => {
                      setCategory(cat);
                      setCatFilterOpen(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{getCategoryName(cat)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal chọn số dòng / trang */}
        <Modal
          visible={pageSizeOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPageSizeOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setPageSizeOpen(false)}>
            <Pressable style={styles.pickerModal} onPress={() => {}}>
              {[10, 20, 50].map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[styles.pickerOption, itemsPerPage === size && styles.pickerOptionActive]}
                  onPress={() => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                    setPageSizeOpen(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{size} / trang</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal Thêm / Sửa giao dịch */}
        <Modal
          visible={formVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFormVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setFormVisible(false)}>
            <Pressable style={styles.formModal} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {editingId ? t('txn.edit_modal_title') : t('txn.add_modal_title')}
              </Text>

              {/* Toggle Thu / Chi */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, formState.type === 'out' && styles.typeBtnOutActive]}
                  onPress={() => setFormState((s) => ({ ...s, type: 'out' }))}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      formState.type === 'out' && { color: COLORS.error, fontWeight: '700' },
                    ]}
                  >
                    {t('txn.type_expense')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, formState.type === 'in' && styles.typeBtnInActive]}
                  onPress={() => setFormState((s) => ({ ...s, type: 'in', category: 'Income' }))}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      formState.type === 'in' && { color: COLORS.success, fontWeight: '700' },
                    ]}
                  >
                    {t('txn.type_income')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{t('txn.field_date')}</Text>
              <TouchableOpacity
                style={styles.modalDateBtn}
                onPress={() => setFormDateOpen(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.modalDateText}>
                  {formState.date.split('-').reverse().join('/')}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t('txn.field_desc')}</Text>
              <TextInput
                style={styles.modalInput}
                value={formState.description}
                onChangeText={(v) => setFormState((s) => ({ ...s, description: v }))}
                placeholder="VD: Highlands Coffee"
              />

              <Text style={styles.inputLabel}>{t('txn.field_amount')}</Text>
              <TextInput
                style={styles.modalInput}
                value={formState.amount}
                onChangeText={(v) => setFormState((s) => ({ ...s, amount: v }))}
                placeholder="65000"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>{t('txn.field_category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STANDARD_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        formState.category === cat && styles.catChipActive,
                      ]}
                      onPress={() => setFormState((s) => ({ ...s, category: cat }))}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          formState.category === cat && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {getCategoryName(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFormVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t('txn.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveForm}
                  disabled={submitting}
                >
                  <Text style={styles.saveBtnText}>
                    {submitting
                      ? '...'
                      : editingId
                      ? t('txn.save_changes')
                      : t('txn.submit_add')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Calendar Picker cho bộ lọc */}
        <DatePickerModal
          visible={filterDateOpen}
          value={selectedDate}
          onSelect={(iso) => setSelectedDate(iso)}
          onClear={() => setSelectedDate('')}
          onClose={() => setFilterDateOpen(false)}
          language={language}
          showClear
        />

        {/* Calendar Picker cho form Thêm/Sửa */}
        <DatePickerModal
          visible={formDateOpen}
          value={formState.date}
          onSelect={(iso) => setFormState((s) => ({ ...s, date: iso }))}
          onClose={() => setFormDateOpen(false)}
          language={language}
          showClear={false}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textMain },
  langBtn: {
    backgroundColor: COLORS.glassCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  langText: { fontWeight: '700', fontSize: 12, color: COLORS.primaryDark },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiTile: {
    width: '48%',
    backgroundColor: COLORS.glassCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  kpiVal: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  cardSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  datePickerText: { flex: 1, fontSize: 13, color: COLORS.textMain, paddingVertical: 4, fontWeight: '500' },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  modalDateText: { fontSize: 14, color: COLORS.textMain, fontWeight: '600' },
  filterActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pageSizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectText: { fontSize: 12, fontWeight: '600', color: COLORS.textMain, flexShrink: 1 },
  refreshBtn: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },

  centerBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  clearFilterBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  clearFilterText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  txnList: { gap: 10 },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  txnDesc: { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  txnMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  txnDate: { fontSize: 11, color: COLORS.textMuted },
  catBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primaryDark },
  confBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confText: { fontSize: 10, fontWeight: '700' },
  txnRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  txnAmt: { fontSize: 14, fontWeight: '800' },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rowIconBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  pageIndicator: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
  },
  pickerOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  pickerOptionActive: { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
  pickerOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.textMain },

  formModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
  },
  typeBtnOutActive: { backgroundColor: 'rgba(220, 38, 38, 0.12)' },
  typeBtnInActive: { backgroundColor: 'rgba(5, 150, 105, 0.12)' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain,
    marginBottom: 10,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  catChipActive: { backgroundColor: COLORS.primary },
  catChipText: { fontSize: 12, color: COLORS.textMain },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '700', color: COLORS.textMuted },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { fontWeight: '700', color: '#fff' },
});
