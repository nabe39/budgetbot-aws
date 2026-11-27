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
import CalendarPickerModal from '../components/CalendarPickerModal';
import { COLORS } from '../theme';

const CATEGORY_OPTIONS = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Subscriptions',
  'Housing',
  'Transfer',
  'Other',
];

const QUICK_AMOUNTS = [
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 },
];

export default function LimitsScreen() {
  const { t, getCategoryName, language, toggleLanguage } = useLanguage();
  const [caps, setCaps] = useState({});
  const [currentSpends, setCurrentSpends] = useState({});
  const [loading, setLoading] = useState(false);

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [periodMode, setPeriodMode] = useState('month'); // 'month' | 'year'
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [availableMonths, setAvailableMonths] = useState(new Set());
  const [calOpen, setCalOpen] = useState(false);

  const [modalData, setModalData] = useState({
    isOpen: false,
    isEdit: false,
    category: 'Food',
    amount: '',
  });
  const [modalSaving, setModalSaving] = useState(false);

  const formatMonthLabel = useCallback(
    (mStr) => {
      if (!mStr) return '';
      if (mStr.length === 4) {
        return language === 'vi' ? `Năm ${mStr}` : `Year ${mStr}`;
      }
      if (!mStr.includes('-')) return mStr;
      const [y, m] = mStr.split('-');
      return language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
    },
    [language]
  );

  useEffect(() => {
    api
      .get('/summary')
      .then((res) => {
        const trends = res.data?.monthly_trends || [];
        setAvailableMonths(new Set(trends.map((item) => item.month)));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(
    async (targetMonth = selectedMonth) => {
      setLoading(true);
      try {
        const [capsRes, sumRes] = await Promise.all([
          api.get('/caps'),
          api.get('/summary', { params: { month: targetMonth } }),
        ]);
        setCaps(capsRes.data.caps || {});
        const spends = {};
        if (sumRes.data.by_category) {
          Object.entries(sumRes.data.by_category).forEach(([cat, val]) => {
            if ((val?.total ?? 0) < 0) {
              spends[cat] = Math.abs(val.total);
            }
          });
        }
        setCurrentSpends(spends);
      } catch {
        // Ignore network errors
      } finally {
        setLoading(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    fetchData(selectedMonth);
  }, [fetchData, selectedMonth]);

  const handlePrevPeriod = () => {
    if (periodMode === 'year') {
      const y = parseInt(selectedMonth.slice(0, 4), 10);
      if (!Number.isNaN(y)) setSelectedMonth(String(y - 1));
      return;
    }
    if (!selectedMonth.includes('-')) return;
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextPeriod = () => {
    if (periodMode === 'year') {
      const y = parseInt(selectedMonth.slice(0, 4), 10);
      if (!Number.isNaN(y)) setSelectedMonth(String(y + 1));
      return;
    }
    if (!selectedMonth.includes('-')) return;
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const openAddModal = () => {
    const defaultCat = CATEGORY_OPTIONS.find((c) => !caps[c]) || 'Food';
    setModalData({
      isOpen: true,
      isEdit: Boolean(caps[defaultCat]),
      category: defaultCat,
      amount: caps[defaultCat] ? String(caps[defaultCat]) : '',
    });
  };

  const openEditModal = (cat, limit) => {
    setModalData({
      isOpen: true,
      isEdit: true,
      category: cat,
      amount: String(limit),
    });
  };

  const handleSaveModal = async () => {
    const numericAmt = parseFloat(modalData.amount);
    if (!modalData.category || Number.isNaN(numericAmt) || numericAmt <= 0) {
      Alert.alert(
        'Thiếu thông tin',
        language === 'vi'
          ? 'Vui lòng nhập số tiền hạn mức hợp lệ (> 0).'
          : 'Please enter a valid budget amount (> 0).'
      );
      return;
    }
    setModalSaving(true);
    try {
      await api.post('/caps', { category: modalData.category, amount: numericAmt });
      setModalData((prev) => ({ ...prev, isOpen: false }));
      await fetchData(selectedMonth);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.detail || err.message);
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteCap = (cat) => {
    Alert.alert(
      'Xác nhận',
      t('limits.confirm_delete').replace('{category}', getCategoryName(cat)),
      [
        { text: t('txn.cancel'), style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/caps/${encodeURIComponent(cat)}`);
              await fetchData(selectedMonth);
            } catch {
              Alert.alert('Lỗi', t('limits.delete_failed'));
            }
          },
        },
      ]
    );
  };

  const periodMultiplier = periodMode === 'year' ? 12 : 1;

  const { exceededAlerts, warningAlerts, totalBudget, totalSpent, overallPct } = useMemo(() => {
    const exceeded = [];
    const warning = [];
    let tBudget = 0;
    let tSpent = 0;

    Object.entries(caps).forEach(([cat, monthlyLimit]) => {
      const limit = monthlyLimit * periodMultiplier;
      const spent = currentSpends[cat] || 0;
      tBudget += limit;
      tSpent += spent;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      if (pct > 100) {
        exceeded.push({ cat, limit, spent, pct, over: spent - limit });
      } else if (pct >= 80) {
        warning.push({ cat, limit, spent, pct });
      }
    });

    const oPct = tBudget > 0 ? Math.round((tSpent / tBudget) * 100) : 0;
    return {
      exceededAlerts: exceeded,
      warningAlerts: warning,
      totalBudget: tBudget,
      totalSpent: tSpent,
      overallPct: oPct,
    };
  }, [caps, currentSpends, periodMultiplier]);

  const activeCapsEntries = Object.entries(caps);
  const overallColor =
    overallPct > 100 ? COLORS.error : overallPct >= 80 ? COLORS.warn : COLORS.success;
  const overallBg =
    overallPct > 100
      ? 'rgba(220, 38, 38, 0.14)'
      : overallPct >= 80
      ? 'rgba(217, 119, 6, 0.14)'
      : 'rgba(5, 150, 105, 0.14)';

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => fetchData(selectedMonth)} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('limits.screen_title')}</Text>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* 4 KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('limits.total_budget')}</Text>
              <Text style={[styles.kpiVal, { color: COLORS.primary }]}>
                {formatCurrency(totalBudget)}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('limits.total_spent')}</Text>
              <Text
                style={[
                  styles.kpiVal,
                  { color: overallPct > 100 ? COLORS.error : COLORS.textMain },
                ]}
              >
                {formatCurrency(totalSpent)}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('limits.net_remaining')}</Text>
              <Text
                style={[
                  styles.kpiVal,
                  { color: totalBudget >= totalSpent ? COLORS.success : COLORS.error },
                ]}
              >
                {totalBudget >= totalSpent ? '' : '-'}
                {formatCurrency(Math.abs(totalBudget - totalSpent))}
              </Text>
            </View>

            <View style={styles.kpiTile}>
              <Text style={styles.kpiLabel}>{t('limits.utilization')}</Text>
              <View style={styles.rateRow}>
                <Text style={[styles.kpiVal, { color: overallColor, marginTop: 0 }]}>
                  {overallPct}%
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: overallBg }]}>
                  <Text style={[styles.statusBadgeText, { color: overallColor }]}>
                    {overallPct > 100
                      ? t('limits.status_exceeded')
                      : overallPct >= 80
                      ? t('limits.status_warning')
                      : t('limits.status_on_track')}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, overallPct)}%`, backgroundColor: overallColor },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Main Card */}
          <GlassCard>
            <View style={styles.mainHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('limits.title')}</Text>
                <Text style={styles.cardSubtitle}>
                  {activeCapsEntries.length}{' '}
                  {language === 'vi' ? 'danh mục áp dụng hạn mức' : 'active limits'} •{' '}
                  {formatMonthLabel(selectedMonth)}
                </Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{t('limits.save_btn')}</Text>
              </TouchableOpacity>
            </View>

            {/* Period Navigator */}
            <View style={styles.navControls}>
              <View style={styles.monthNavBox}>
                <TouchableOpacity style={styles.navArrowBtn} onPress={handlePrevPeriod}>
                  <Ionicons name="chevron-back" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.calTrigger} onPress={() => setCalOpen(true)}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.calTriggerText}>{formatMonthLabel(selectedMonth)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextPeriod}>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              {selectedMonth !== currentMonthStr && (
                <TouchableOpacity
                  style={styles.jumpBtn}
                  onPress={() => {
                    setPeriodMode('month');
                    setSelectedMonth(currentMonthStr);
                  }}
                >
                  <Text style={styles.jumpBtnText}>{t('limits.jump_to_current')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Alert Banners */}
            {exceededAlerts.length > 0 && (
              <View style={[styles.alertBanner, styles.alertExceeded]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.alertText}>
                  <Text style={{ fontWeight: '800', color: COLORS.error }}>
                    {language === 'vi' ? 'Vượt hạn mức: ' : 'Budget Exceeded: '}
                  </Text>
                  {exceededAlerts
                    .map(
                      (i) =>
                        `${getCategoryName(i.cat)} (+${formatCurrency(i.over)})`
                    )
                    .join(' • ')}
                </Text>
              </View>
            )}

            {warningAlerts.length > 0 && (
              <View style={[styles.alertBanner, styles.alertWarning]}>
                <Ionicons name="warning" size={18} color={COLORS.warn} />
                <Text style={styles.alertText}>
                  <Text style={{ fontWeight: '800', color: COLORS.warn }}>
                    {language === 'vi' ? 'Cảnh báo (≥80%): ' : 'Warning (≥80%): '}
                  </Text>
                  {warningAlerts
                    .map((i) => `${getCategoryName(i.cat)} (${i.pct}%)`)
                    .join(' • ')}
                </Text>
              </View>
            )}

            {/* Caps List */}
            {loading && activeCapsEntries.length === 0 ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : activeCapsEntries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="notifications-off-outline" size={38} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t('limits.no_limits')}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>{t('limits.save_btn')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.capsList}>
                {activeCapsEntries.map(([cat, monthlyLimit]) => {
                  const limit = monthlyLimit * periodMultiplier;
                  const spent = currentSpends[cat] || 0;
                  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                  const isExceeded = pct > 100;
                  const isWarn = !isExceeded && pct >= 80;
                  const barColor = isExceeded
                    ? COLORS.error
                    : isWarn
                    ? COLORS.warn
                    : COLORS.success;
                  const badgeBg = isExceeded
                    ? 'rgba(220, 38, 38, 0.14)'
                    : isWarn
                    ? 'rgba(217, 119, 6, 0.14)'
                    : 'rgba(5, 150, 105, 0.14)';

                  return (
                    <View key={cat} style={styles.capRowCard}>
                      <View style={styles.capTopRow}>
                        <Text style={styles.capCatName}>{getCategoryName(cat)}</Text>
                        <View style={styles.capActions}>
                          <TouchableOpacity
                            style={styles.rowIconBtn}
                            onPress={() => openEditModal(cat, monthlyLimit)}
                          >
                            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rowIconBtn}
                            onPress={() => handleDeleteCap(cat)}
                          >
                            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.capNumbersRow}>
                        <Text style={styles.capNumText}>
                          {t('limits.col_spent')}:{' '}
                          <Text style={{ fontWeight: '800', color: barColor }}>
                            {formatCurrency(spent)}
                          </Text>
                        </Text>
                        <Text style={styles.capNumText}>
                          {t('limits.col_limit')}:{' '}
                          <Text style={{ fontWeight: '800', color: COLORS.textMain }}>
                            {formatCurrency(limit)}
                          </Text>
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, pct)}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>

                      <View style={styles.capBottomRow}>
                        <Text style={[styles.capRemainText, { color: barColor }]}>
                          {isExceeded
                            ? t('limits.over_by').replace('{amount}', formatCurrency(spent - limit))
                            : t('limits.remaining').replace('{amount}', formatCurrency(limit - spent))}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.statusBadgeText, { color: barColor }]}>
                            {pct}% •{' '}
                            {isExceeded
                              ? t('limits.status_exceeded')
                              : isWarn
                              ? t('limits.status_warning')
                              : t('limits.status_on_track')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </GlassCard>
        </ScrollView>

        {/* Calendar Picker (Month / Year) */}
        <CalendarPickerModal
          visible={calOpen}
          mode={periodMode}
          value={selectedMonth}
          modes={['month', 'year']}
          availableMonths={availableMonths}
          language={language}
          onChange={(newMode, newVal) => {
            setPeriodMode(newMode);
            setSelectedMonth(newVal);
          }}
          onClose={() => setCalOpen(false)}
        />

        {/* Modal Thêm / Sửa Hạn mức */}
        <Modal
          visible={modalData.isOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setModalData((p) => ({ ...p, isOpen: false }))}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalData((p) => ({ ...p, isOpen: false }))}
          >
            <Pressable style={styles.formModal} onPress={() => {}}>
              <Text style={styles.modalTitle}>
                {modalData.isEdit ? t('limits.update_btn') : t('limits.save_btn')}
              </Text>

              <Text style={styles.inputLabel}>{t('limits.cat_label')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        modalData.category === cat && styles.catChipActive,
                      ]}
                      onPress={() =>
                        setModalData((p) => ({
                          ...p,
                          category: cat,
                          amount: caps[cat] ? String(caps[cat]) : p.amount,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          modalData.category === cat && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {getCategoryName(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>{t('limits.cap_label')}</Text>
              <TextInput
                style={styles.modalInput}
                value={modalData.amount}
                onChangeText={(v) => setModalData((p) => ({ ...p, amount: v }))}
                placeholder="VD: 5000000"
                keyboardType="numeric"
              />

              {/* Quick Amount Chips */}
              <View style={styles.quickAmtRow}>
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q.label}
                    style={styles.quickAmtChip}
                    onPress={() => setModalData((p) => ({ ...p, amount: String(q.value) }))}
                  >
                    <Text style={styles.quickAmtText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalData((p) => ({ ...p, isOpen: false }))}
                >
                  <Text style={styles.cancelBtnText}>{t('txn.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveModal}
                  disabled={modalSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {modalSaving ? '...' : t('limits.save_btn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
  rateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
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

  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  monthNavBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: 4,
  },
  navArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calTriggerText: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  jumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  jumpBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  alertExceeded: { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
  alertWarning: { backgroundColor: 'rgba(217, 119, 6, 0.12)' },
  alertText: { flex: 1, fontSize: 12, color: COLORS.textMain, lineHeight: 18 },

  centerBox: { paddingVertical: 30, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },

  capsList: { gap: 10 },
  capRowCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    gap: 6,
  },
  capTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capCatName: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  capActions: { flexDirection: 'row', gap: 8 },
  rowIconBtn: { padding: 4, borderRadius: 6, backgroundColor: '#fff' },
  capNumbersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  capNumText: { fontSize: 12, color: COLORS.textMuted },
  capBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  capRemainText: { fontSize: 12, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 6 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  catChipActive: { backgroundColor: COLORS.primary },
  catChipText: { fontSize: 12, color: COLORS.textMain },
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
  quickAmtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  quickAmtChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  quickAmtText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  modalActions: { flexDirection: 'row', gap: 10 },
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
