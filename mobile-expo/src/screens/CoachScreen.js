import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/format';
import GlassCard from '../components/GlassCard';
import { COLORS } from '../theme';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];

export default function CoachScreen() {
  const { t, getCategoryName, language, toggleLanguage } = useLanguage();
  const [insights, setInsights] = useState(null);
  const [suggestedCaps, setSuggestedCaps] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handlingCap, setHandlingCap] = useState(null);

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/coach');
      if (res.data.insights) {
        setInsights(res.data.insights);
        setSuggestedCaps(res.data.suggested_caps || []);
        setChartData(res.data.chartData || []);
      } else {
        setError(t('coach.no_insights'));
      }
    } catch (err) {
      setError(t('coach.fail_insights') + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const acceptCap = async (cap) => {
    setHandlingCap(cap.category);
    try {
      await api.post('/caps', { category: cap.category, amount: cap.suggested_cap });
      setSuggestedCaps((prev) => prev.filter((c) => c.category !== cap.category));
      Alert.alert('Thành công', `Đã áp dụng hạn mức cho ${getCategoryName(cap.category)}`);
    } catch (err) {
      Alert.alert('Lỗi', t('coach.fail_cap') + (err.response?.data?.detail || err.message));
    } finally {
      setHandlingCap(null);
    }
  };

  const ignoreCap = (category) => {
    setSuggestedCaps((prev) => prev.filter((c) => c.category !== category));
  };

  const getInsightStyle = (type) => {
    if (type === 'positive') {
      return {
        bg: 'rgba(34, 197, 94, 0.08)',
        border: '#22c55e',
        text: '#14532d',
        desc: '#166534',
        icon: 'wallet-outline',
      };
    }
    if (type === 'warning') {
      return {
        bg: 'rgba(239, 68, 68, 0.08)',
        border: '#ef4444',
        text: '#7f1d1d',
        desc: '#991b1b',
        icon: 'warning-outline',
      };
    }
    return {
      bg: 'rgba(59, 130, 246, 0.08)',
      border: '#3b82f6',
      text: '#1e3a8a',
      desc: '#1e40af',
      icon: 'bulb-outline',
    };
  };

  const pieItems = chartData.map((entry, idx) => ({
    value: Math.abs(Number(entry.value) || 0),
    color: CHART_COLORS[idx % CHART_COLORS.length],
    label: getCategoryName(entry.name),
  }));

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('coach.screen_title')}</Text>
            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langText}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Single Main Card matching Web */}
          <GlassCard style={styles.mainCard}>
            <View style={styles.heroHeaderRow}>
              <Ionicons name="color-wand" size={20} color={COLORS.primary} />
              <Text style={styles.heroTitle}>{t('coach.title')}</Text>
            </View>
            <Text style={styles.subtitle}>{t('coach.subtitle')}</Text>

            <TouchableOpacity
              style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
              onPress={generateInsights}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="flash" size={18} color="#fff" />
              )}
              <Text style={styles.ctaText}>
                {loading ? t('coach.btn_analyzing') : t('coach.btn_generate')}
              </Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Ready State inside the same card */}
            {!insights && !loading && (
              <View style={styles.readyBox}>
                <Ionicons name="logo-android" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>{t('coach.ready_prompt')}</Text>
              </View>
            )}
          </GlassCard>

          {/* Results */}
          {insights && (
            <>
              {/* Distribution Chart */}
              {pieItems.length > 0 && (
                <GlassCard>
                  <Text style={styles.sectionTitle}>{t('coach.spending_distribution')}</Text>
                  <View style={styles.pieWrap}>
                    <PieChart data={pieItems} donut radius={82} innerRadius={48} />
                    <View style={styles.legend}>
                      {pieItems.map((item) => (
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
                </GlassCard>
              )}

              {/* Action Plan Insights */}
              <GlassCard>
                <Text style={styles.sectionTitle}>{t('coach.action_plan')}</Text>
                <View style={styles.insightsList}>
                  {insights.map((insight, idx) => {
                    const st = getInsightStyle(insight.type);
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.insightBox,
                          { backgroundColor: st.bg, borderLeftColor: st.border },
                        ]}
                      >
                        <View style={styles.insightHeader}>
                          <View style={[styles.insightIconCircle, { backgroundColor: st.border }]}>
                            <Ionicons name={st.icon} size={18} color="#fff" />
                          </View>
                          <Text style={[styles.insightTitle, { color: st.text }]}>
                            {insight.title}
                          </Text>
                        </View>
                        <Text style={[styles.insightDesc, { color: st.desc }]}>
                          {insight.description}
                        </Text>

                        {insight.actionable_steps?.length > 0 && (
                          <View style={styles.stepsBox}>
                            <Text style={[styles.stepsHeading, { color: st.text }]}>
                              {t('coach.action_items')}
                            </Text>
                            {insight.actionable_steps.map((step, sIdx) => (
                              <View key={sIdx} style={styles.stepRow}>
                                <Ionicons
                                  name="checkbox-outline"
                                  size={16}
                                  color={st.border}
                                  style={{ marginTop: 2 }}
                                />
                                <Text style={styles.stepText}>{step}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </GlassCard>

              {/* Suggested Caps */}
              {suggestedCaps.length > 0 && (
                <GlassCard>
                  <View style={styles.capHeaderRow}>
                    <Ionicons name="disc-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.sectionTitleNoMargin}>{t('coach.suggested_caps')}</Text>
                  </View>
                  <View style={styles.capsList}>
                    {suggestedCaps.map((cap, idx) => {
                      const busy = handlingCap === cap.category;
                      return (
                        <View key={idx} style={styles.capCard}>
                          <Text style={styles.capCat}>{getCategoryName(cap.category)}</Text>
                          <Text style={styles.capReason}>{cap.reason}</Text>
                          <Text style={styles.capAmt}>{formatCurrency(cap.suggested_cap)}</Text>
                          <View style={styles.capActions}>
                            <TouchableOpacity
                              style={styles.ignoreBtn}
                              disabled={busy}
                              onPress={() => ignoreCap(cap.category)}
                            >
                              <Text style={styles.ignoreText}>{t('coach.ignore')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.acceptBtn, busy && { opacity: 0.7 }]}
                              disabled={busy}
                              onPress={() => acceptCap(cap)}
                            >
                              <Text style={styles.acceptText}>
                                {busy ? t('coach.saving') : t('coach.accept')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </GlassCard>
              )}
            </>
          )}
        </ScrollView>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  langBtn: {
    backgroundColor: COLORS.glassCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  langText: { fontWeight: '700', fontSize: 12, color: COLORS.primaryDark },

  mainCard: { alignItems: 'center', gap: 12 },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textMain, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },

  readyBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
    borderRadius: 16,
    gap: 10,
    marginTop: 10,
  },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain, marginBottom: 12 },
  sectionTitleNoMargin: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  pieWrap: { alignItems: 'center', gap: 14 },
  legend: { width: '100%', gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.textMain },
  legendVal: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },

  insightsList: { gap: 12 },
  insightBox: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  insightDesc: { fontSize: 13, lineHeight: 19 },
  stepsBox: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  stepsHeading: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepText: { flex: 1, fontSize: 13, color: COLORS.textMain, lineHeight: 18 },

  capHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  capsList: { gap: 10 },
  capCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  capCat: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  capReason: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  capAmt: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  capActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  ignoreBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  ignoreText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  acceptBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
