import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatShortVND } from '../utils/format';
import GlassCard from '../components/GlassCard';
import CalendarPickerModal from '../components/CalendarPickerModal';
import { COLORS } from '../theme';

const PIE_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
  '#64748b',
];

export default function OverviewScreen() {
  const { user, logout } = useAuth();
  const { t, getCategoryName, language, toggleLanguage } = useLanguage();
  const [summaryData, setSummaryData] = useState(null);
  const [periodMode, setPeriodMode] = useState('all'); // 'all' | 'month' | 'year'
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const previousMonthStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const availableMonthsSet = useMemo(() => {
    if (!summaryData?.monthly_trends) return new Set();
    return new Set(summaryData.monthly_trends.map((item) => item.month));
  }, [summaryData]);

  // Build all 12 months (01..12) of the target calendar year matching web Overview.jsx
  const last12MonthsTrends = useMemo(() => {
    const trends = summaryData?.monthly_trends || [];
    const trendMap = new Map(trends.map((item) => [item.month, item]));

    let targetYear = parseInt(currentMonthStr.slice(0, 4), 10);
    if (month && month.length >= 4) {
      const selectedY = parseInt(month.slice(0, 4), 10);
      if (!Number.isNaN(selectedY)) targetYear = selectedY;
    } else if (trends.length > 0) {
      const latestY = parseInt(trends[trends.length - 1].month.slice(0, 4), 10);
      if (!Number.isNaN(latestY) && latestY > targetYear) targetYear = latestY;
    }

    const result = [];
    for (let m = 1; m <= 12; m++) {
      const mKey = `${targetYear}-${String(m).padStart(2, '0')}`;
      const existing = trendMap.get(mKey);
      result.push(existing || { month: mKey, income: 0, expense: 0, net: 0 });
    }
    return result;
  }, [summaryData, currentMonthStr, month]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = month ? `?month=${month}` : '';
      const res = await api.get(`/summary${suffix}`);
      setSummaryData(res.data);
    } catch {
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setSelectedTrend(null);
    fetchSummary();
  }, [fetchSummary]);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/*',
        ],
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });
      setUploading(true);
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Thành công', `Đã tải lên ${file.name}`);
      fetchSummary();
    } catch (err) {
      Alert.alert('Lỗi upload', err.response?.data?.detail || err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatPeriodLabel = (val) => {
    if (!val) return t('overview.pick_month');
    if (val.length === 4) {
      return language === 'vi' ? `Năm ${val}` : `Year ${val}`;
    }
    const [y, m] = val.split('-');
    return language === 'vi' ? `Tháng ${m}/${y}` : `${m}/${y}`;
  };

  const byCat = summaryData?.by_category || {};
  const hasData = !!summaryData && Object.keys(byCat).length > 0;

  const totalIncome =
    summaryData?.total_income ??
    Object.values(byCat)
      .filter((v) => (v?.total ?? 0) > 0)
      .reduce((s, v) => s + v.total, 0);

  const totalExpense =
    summaryData?.total_expense ??
    Object.values(byCat)
      .filter((v) => (v?.total ?? 0) < 0)
      .reduce((s, v) => s + Math.abs(v.total), 0);

  const net = summaryData?.net_savings ?? totalIncome - totalExpense;
  const savingsRate =
    summaryData?.savings_rate ??
    (totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0);

  let savingsBadge = {
    text: t('savings.outstanding'),
    bg: 'rgba(5, 150, 105, 0.15)',
    color: COLORS.success,
  };
  if (savingsRate < 0) {
    savingsBadge = {
      text: t('savings.deficit'),
      bg: 'rgba(220, 38, 38, 0.15)',
      color: COLORS.error,
    };
  } else if (savingsRate < 20) {
    savingsBadge = {
      text: t('savings.low'),
      bg: 'rgba(217, 119, 6, 0.15)',
      color: COLORS.warn,
    };
  } else if (savingsRate < 50) {
    savingsBadge = {
      text: t('savings.healthy'),
      bg: 'rgba(37, 99, 235, 0.15)',
      color: COLORS.primary,
    };
  }

  const pieData = Object.entries(byCat)
    .filter(([cat, val]) => cat !== 'Income' && (val?.total ?? 0) < 0)
    .map(([cat, val], idx) => ({
      value: Math.abs(val.total),
      color: PIE_COLORS[idx % PIE_COLORS.length],
      label: getCategoryName(cat),
    }));

  const barData = useMemo(() => {
    const items = [];
    last12MonthsTrends.forEach((mItem) => {
      const parts = (mItem.month || '').split('-');
      const shortLabel = parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : mItem.month;
      const isSelected = selectedTrend?.month === mItem.month;
      items.push({
        value: mItem.income || 0,
        label: shortLabel,
        spacing: 4,
        labelWidth: 36,
        frontColor: isSelected ? '#059669' : '#10b981',
        onPress: () => setSelectedTrend(mItem),
      });
      items.push({
        value: mItem.expense || 0,
        frontColor: isSelected ? '#e11d48' : '#f43f5e',
        onPress: () => setSelectedTrend(mItem),
      });
    });
    return items;
  }, [last12MonthsTrends, selectedTrend]);

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSummary} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('overview.title')}</Text>
              <Text style={styles.welcome}>
                {user?.full_name || user?.username || 'BudgetBot'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={toggleLanguage}>
                <Text style={styles.langLabel}>{language.toUpperCase()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 1: Upload sao kê */}
          <GlassCard>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={handleUpload}
              disabled={uploading}
              activeOpacity={0.75}
            >
              {uploading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={38} color={COLORS.primary} />
                  <Text style={styles.uploadTitle}>{t('overview.upload_title')}</Text>
                  <Text style={styles.uploadSub}>{t('overview.upload_sub')}</Text>
                </>
              )}
            </TouchableOpacity>
          </GlassCard>

          {/* Card 2: Tổng quan Chi tiêu */}
          <GlassCard>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="bar-chart" size={18} color={COLORS.primary} />
                <Text style={styles.summaryTitle}>{t('overview.spending_summary')}</Text>
              </View>
              <View style={styles.activeFilterRow}>
                <Ionicons
                  name={month ? 'calendar' : 'globe-outline'}
                  size={13}
                  color={month ? COLORS.primary : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.activeFilterText,
                    month && { color: COLORS.primary, fontWeight: '600' },
                  ]}
                >
                  {month
                    ? language === 'vi'
                      ? `Đang xem: ${formatPeriodLabel(month)}`
                      : `Viewing: ${formatPeriodLabel(month)}`
                    : t('overview.all_time')}
                </Text>
              </View>
            </View>

            {/* Quick filter tabs + CalendarPicker */}
            <View style={styles.filterControls}>
              <View style={styles.pillGroup}>
                <TouchableOpacity
                  style={[styles.pillTab, month === '' && styles.pillTabActive]}
                  onPress={() => {
                    setPeriodMode('all');
                    setMonth('');
                  }}
                >
                  <Ionicons
                    name="layers-outline"
                    size={13}
                    color={month === '' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text style={[styles.pillText, month === '' && styles.pillTextActive]}>
                    {t('overview.all_time')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillTab, month === currentMonthStr && styles.pillTabActive]}
                  onPress={() => {
                    setPeriodMode('month');
                    setMonth(currentMonthStr);
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      month === currentMonthStr && styles.pillTextActive,
                    ]}
                  >
                    {t('overview.current_month')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillTab, month === previousMonthStr && styles.pillTabActive]}
                  onPress={() => {
                    setPeriodMode('month');
                    setMonth(previousMonthStr);
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      month === previousMonthStr && styles.pillTextActive,
                    ]}
                  >
                    {t('overview.previous_month')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.calendarBtnRow}>
                <TouchableOpacity
                  style={[styles.calendarBtn, month && styles.calendarBtnActive]}
                  onPress={() => setIsCalendarOpen(true)}
                >
                  <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                  <Text
                    style={[
                      styles.calendarBtnText,
                      month && { color: COLORS.primary },
                    ]}
                  >
                    {formatPeriodLabel(month)}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color={COLORS.textMuted} />
                </TouchableOpacity>

                {month ? (
                  <TouchableOpacity
                    style={styles.clearMonthBtn}
                    onPress={() => {
                      setPeriodMode('all');
                      setMonth('');
                    }}
                  >
                    <Ionicons name="close" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Nội dung Tổng quan Chi tiêu */}
            {loading && !summaryData ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : !hasData ? (
              <Text style={styles.emptyText}>{t('overview.no_data')}</Text>
            ) : (
              <View style={styles.dataSection}>
                {/* 4 KPI Tiles (2x2) */}
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiLabel}>{t('overview.total_income')}</Text>
                    <Text style={[styles.kpiVal, { color: COLORS.success }]}>
                      {formatCurrency(totalIncome)}
                    </Text>
                  </View>

                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiLabel}>{t('overview.total_expenses')}</Text>
                    <Text style={[styles.kpiVal, { color: COLORS.error }]}>
                      {formatCurrency(totalExpense)}
                    </Text>
                  </View>

                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiLabel}>{t('overview.net_savings')}</Text>
                    <Text
                      style={[
                        styles.kpiVal,
                        { color: net >= 0 ? COLORS.success : COLORS.error },
                      ]}
                    >
                      {net >= 0 ? '' : '-'}
                      {formatCurrency(Math.abs(net))}
                    </Text>
                  </View>

                  <View style={styles.kpiTile}>
                    <Text style={styles.kpiLabel} numberOfLines={1}>
                      {t('overview.savings_rate')}
                    </Text>
                    <View style={styles.rateValueRow}>
                      <Text style={[styles.kpiVal, { color: savingsBadge.color, marginTop: 0 }]}>
                        {savingsRate}%
                      </Text>
                      <View style={[styles.rateBadge, { backgroundColor: savingsBadge.bg }]}>
                        <Text style={[styles.rateBadgeText, { color: savingsBadge.color }]}>
                          {savingsBadge.text}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                            backgroundColor: savingsBadge.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Top 3 Drivers — Podium Chart (2 - 1 - 3) */}
                {summaryData.top_3_drivers?.length > 0 && (() => {
                  const drivers = summaryData.top_3_drivers.slice(0, 3);
                  const podiumOrder =
                    drivers.length === 3 ? [1, 0, 2] : drivers.length === 2 ? [1, 0] : [0];
                  const maxAmount = Math.max(...drivers.map((d) => Math.abs(d.total || 0)), 1);

                  const rankThemes = {
                    0: {
                      rank: 1,
                      gradient: ['#86efac', '#5eead4'],
                      textColor: '#065f46',
                      pctBg: '#bbf7d0',
                      pctColor: '#047857',
                      minHeight: 155,
                    },
                    1: {
                      rank: 2,
                      gradient: ['#dbeafe', '#bfdbfe'],
                      textColor: '#0f172a',
                      pctBg: 'transparent',
                      pctColor: '#475569',
                      minHeight: 118,
                    },
                    2: {
                      rank: 3,
                      gradient: ['#fee2e2', '#fecaca'],
                      textColor: '#991b1b',
                      pctBg: 'transparent',
                      pctColor: '#475569',
                      minHeight: 96,
                    },
                  };

                  const periodBadge = month
                    ? month.length === 4
                      ? `${language === 'vi' ? 'NĂM' : 'YEAR'} ${month}`
                      : language === 'vi'
                      ? `THÁNG ${parseInt(month.split('-')[1], 10)}`
                      : month
                    : t('overview.all_time').toUpperCase();

                  return (
                    <View style={styles.podiumSection}>
                      <View style={styles.podiumHeader}>
                        <View style={styles.podiumTitleRow}>
                          <Ionicons name="ribbon-outline" size={18} color={COLORS.success} />
                          <Text style={styles.podiumTitle}>{t('overview.top_drivers')}</Text>
                        </View>
                        <View style={styles.podiumPeriodBadge}>
                          <Text style={styles.podiumPeriodText}>{periodBadge}</Text>
                        </View>
                      </View>

                      <View style={styles.podiumCard}>
                        <View style={styles.podiumColumns}>
                          {podiumOrder.map((idx) => {
                            const d = drivers[idx];
                            const theme = rankThemes[idx];
                            const absVal = Math.abs(d.total || 0);
                            const pct =
                              totalExpense > 0
                                ? ((absVal / totalExpense) * 100).toFixed(1)
                                : '0.0';
                            const barHeight = Math.max(
                              theme.minHeight,
                              Math.round((absVal / maxAmount) * 165)
                            );

                            return (
                              <View key={d.category} style={styles.podiumCol}>
                                <View
                                  style={[
                                    styles.pctBadge,
                                    theme.rank === 1 && {
                                      backgroundColor: theme.pctBg,
                                      paddingHorizontal: 10,
                                      paddingVertical: 3,
                                      borderRadius: 999,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.pctText,
                                      {
                                        color: theme.pctColor,
                                        fontWeight: theme.rank === 1 ? '800' : '600',
                                      },
                                    ]}
                                  >
                                    {pct}%
                                  </Text>
                                </View>

                                <LinearGradient
                                  colors={theme.gradient}
                                  style={[styles.podiumBar, { height: barHeight }]}
                                >
                                  <Text style={[styles.podiumRank, { color: theme.textColor }]}>
                                    {theme.rank}
                                  </Text>
                                  <Text
                                    style={[styles.podiumCat, { color: theme.textColor }]}
                                    numberOfLines={2}
                                  >
                                    {getCategoryName(d.category)}
                                  </Text>
                                  <Text style={[styles.podiumAmount, { color: theme.textColor }]}>
                                    {formatShortVND(absVal)}
                                  </Text>
                                </LinearGradient>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* Biểu đồ cột Thu / Chi đủ 12 tháng trong năm */}
                {barData.length > 0 && (
                  <View style={styles.chartBlock}>
                    <Text style={styles.subSectionTitle}>
                      {t('overview.monthly_comparison')}
                    </Text>
                    <View style={styles.barLegend}>
                      <View style={styles.barLegendItem}>
                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                        <Text style={styles.barLegendText}>{t('overview.income_bar')}</Text>
                      </View>
                      <View style={styles.barLegendItem}>
                        <View style={[styles.dot, { backgroundColor: '#f43f5e' }]} />
                        <Text style={styles.barLegendText}>{t('overview.expense_bar')}</Text>
                      </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <BarChart
                        data={barData}
                        barWidth={14}
                        spacing={18}
                        roundedTop
                        noOfSections={4}
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor="rgba(0,0,0,0.08)"
                        yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                        formatYLabel={(val) => formatShortVND(Number(val))}
                        height={180}
                      />
                    </ScrollView>

                    {selectedTrend ? (
                      (() => {
                        const incVal = selectedTrend.income || 0;
                        const expVal = selectedTrend.expense || 0;
                        const netVal = incVal - expVal;
                        const parts = (selectedTrend.month || '').split('-');
                        const monthTitle =
                          parts.length === 2
                            ? language === 'vi'
                              ? `Tháng ${parts[1]}/${parts[0]}`
                              : `${parts[1]}/${parts[0]}`
                            : selectedTrend.month;

                        return (
                          <View style={styles.trendDetailCard}>
                            <View style={styles.trendDetailHeader}>
                              <View style={styles.trendDetailTitleRow}>
                                <Ionicons name="calendar" size={15} color={COLORS.primary} />
                                <Text style={styles.trendDetailTitle}>{monthTitle}</Text>
                              </View>
                              <TouchableOpacity onPress={() => setSelectedTrend(null)}>
                                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                              </TouchableOpacity>
                            </View>

                            <View style={styles.trendDetailRow}>
                              <Text style={[styles.trendLabel, { color: '#10b981' }]}>
                                {t('overview.income_bar')}:
                              </Text>
                              <Text style={[styles.trendValue, { color: '#10b981' }]}>
                                +{formatCurrency(incVal)}
                              </Text>
                            </View>

                            <View style={styles.trendDetailRow}>
                              <Text style={[styles.trendLabel, { color: '#f43f5e' }]}>
                                {t('overview.expense_bar')}:
                              </Text>
                              <Text style={[styles.trendValue, { color: '#f43f5e' }]}>
                                -{formatCurrency(expVal)}
                              </Text>
                            </View>

                            <View style={[styles.trendDetailRow, styles.trendNetRow]}>
                              <Text
                                style={[
                                  styles.trendLabel,
                                  { color: netVal >= 0 ? '#10b981' : '#f43f5e' },
                                ]}
                              >
                                {t('overview.net_savings')}:
                              </Text>
                              <Text
                                style={[
                                  styles.trendValue,
                                  { color: netVal >= 0 ? '#10b981' : '#f43f5e' },
                                ]}
                              >
                                {netVal >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(netVal))}
                              </Text>
                            </View>
                          </View>
                        );
                      })()
                    ) : (
                      <Text style={styles.trendHint}>
                        {language === 'vi'
                          ? 'Chạm vào cột tháng bất kỳ để xem chi tiết thu chi.'
                          : 'Tap any month bar to view details.'}
                      </Text>
                    )}
                  </View>
                )}

                {/* Biểu đồ tròn Chi tiêu theo danh mục */}
                {pieData.length > 0 && (
                  <View style={styles.chartBlock}>
                    <Text style={styles.subSectionTitle}>
                      {t('overview.spending_by_category')}
                    </Text>
                    <View style={styles.pieWrap}>
                      <PieChart data={pieData} donut radius={82} innerRadius={48} />
                      <View style={styles.legend}>
                        {pieData.map((item) => (
                          <View key={item.label} style={styles.legendRow}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={styles.legendLabel} numberOfLines={1}>
                              {item.label}
                            </Text>
                            <Text style={styles.legendVal}>{formatCurrency(item.value)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </GlassCard>
        </ScrollView>

        <CalendarPickerModal
          visible={isCalendarOpen}
          mode={periodMode}
          value={month}
          modes={['all', 'month', 'year']}
          availableMonths={availableMonthsSet}
          language={language}
          onChange={(newMode, newVal) => {
            setPeriodMode(newMode);
            setMonth(newVal);
          }}
          onClose={() => setIsCalendarOpen(false)}
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
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textMain },
  welcome: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: COLORS.glassCard,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  langLabel: { fontWeight: '700', fontSize: 12, color: COLORS.primaryDark },

  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(37, 99, 235, 0.35)',
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    gap: 6,
  },
  uploadTitle: { color: COLORS.textMain, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  uploadSub: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },

  summaryHeader: { marginBottom: 12 },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain },
  activeFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  activeFilterText: { fontSize: 12, color: COLORS.textMuted },

  filterControls: { gap: 10, marginBottom: 16 },
  pillGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 9,
  },
  pillTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  pillTextActive: { color: COLORS.primary, fontWeight: '700' },

  calendarBtnRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  calendarBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  calendarBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  clearMonthBtn: {
    marginLeft: 6,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },

  centerBox: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 22 },

  dataSection: { gap: 18 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiTile: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  kpiVal: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  rateValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rateBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  rateBadgeText: { fontSize: 10, fontWeight: '700' },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  podiumSection: { gap: 10 },
  podiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  podiumTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podiumTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  podiumPeriodBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  podiumPeriodText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  podiumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  podiumColumns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pctBadge: { marginBottom: 6 },
  pctText: { fontSize: 12 },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  podiumRank: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  podiumCat: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  podiumAmount: { fontSize: 15, fontWeight: '800' },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },

  chartBlock: { marginTop: 4 },
  barLegend: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLegendText: { fontSize: 12, color: COLORS.textMain, fontWeight: '600' },
  trendHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  trendDetailCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    gap: 6,
  },
  trendDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  trendDetailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendDetailTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  trendDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendNetRow: {
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  trendLabel: { fontSize: 13, fontWeight: '600' },
  trendValue: { fontSize: 13, fontWeight: '800' },

  pieWrap: { alignItems: 'center', gap: 14, marginTop: 4 },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.textMain },
  legendVal: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
});
