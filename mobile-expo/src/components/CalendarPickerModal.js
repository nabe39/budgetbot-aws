import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const WEEKDAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MONTHS_SHORT_VI = [
  'Th1', 'Th2', 'Th3', 'Th4',
  'Th5', 'Th6', 'Th7', 'Th8',
  'Th9', 'Th10', 'Th11', 'Th12',
];

const MONTHS_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_FULL_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const MONTHS_FULL_EN = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toIsoDate(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export default function CalendarPickerModal({
  visible,
  mode = 'all',
  value = '',
  modes = ['all', 'month', 'year'],
  availableMonths,
  onChange,
  onClose,
  language = 'vi',
}) {
  const today = useMemo(() => new Date(), []);
  const todayStr = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const currentMonthStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;

  const [tabMode, setTabMode] = useState(mode === 'all' ? (modes.includes('month') ? 'month' : modes[0]) : mode);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!visible) return;
    if (mode === 'all') {
      setTabMode(modes.includes('month') ? 'month' : modes[0]);
    } else {
      setTabMode(mode);
    }
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    } else if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    } else if (value && /^\d{4}$/.test(value)) {
      setViewYear(Number(value));
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [visible, mode, value, modes, today]);

  const dayCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const list = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      list.push({ day, iso: toIsoDate(prevY, prevM, day), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ day: d, iso: toIsoDate(viewYear, viewMonth, d), inMonth: true });
    }
    const totalNeeded = list.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (list.length < totalNeeded) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      list.push({ day: nextDay, iso: toIsoDate(nextY, nextM, nextDay), inMonth: false });
      nextDay += 1;
    }
    return list;
  }, [viewYear, viewMonth]);

  const yearList = useMemo(() => {
    const startYear = Math.floor(viewYear / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  }, [viewYear]);

  const modeLabels = {
    all: language === 'vi' ? 'Tất cả' : 'All',
    day: language === 'vi' ? 'Ngày' : 'Day',
    month: language === 'vi' ? 'Tháng' : 'Month',
    year: language === 'vi' ? 'Năm' : 'Year',
  };

  const weekdays = language === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN;
  const monthNamesFull = language === 'vi' ? MONTHS_FULL_VI : MONTHS_FULL_EN;
  const monthNamesShort = language === 'vi' ? MONTHS_SHORT_VI : MONTHS_SHORT_EN;

  const selectableTabs = modes.filter((m) => m !== 'all');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Mode Tabs: Ngày | Tháng | Năm */}
          {selectableTabs.length > 1 && (
            <View style={styles.modeRow}>
              {selectableTabs.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeTab, tabMode === m && styles.modeTabActive]}
                  onPress={() => setTabMode(m)}
                >
                  <Text style={[styles.modeText, tabMode === m && styles.modeTextActive]}>
                    {modeLabels[m]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* DAY MODE */}
          {tabMode === 'day' && (
            <>
              <View style={styles.navHeader}>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear((y) => y - 1);
                    } else {
                      setViewMonth((m) => m - 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-back" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.navTitle}>
                  {monthNamesFull[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear((y) => y + 1);
                    } else {
                      setViewMonth((m) => m + 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {weekdays.map((wd) => (
                  <View key={wd} style={styles.weekCell}>
                    <Text style={styles.weekText}>{wd}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.grid}>
                {dayCells.map((cell) => {
                  const isSelected = mode === 'day' && value === cell.iso;
                  const isToday = todayStr === cell.iso;
                  return (
                    <TouchableOpacity
                      key={cell.iso}
                      style={styles.dayCell}
                      onPress={() => {
                        onChange('day', cell.iso);
                        onClose();
                      }}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          isToday && !isSelected && styles.dayToday,
                          isSelected && styles.daySelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !cell.inMonth && styles.dayTextMuted,
                            isToday && !isSelected && styles.dayTextToday,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* MONTH MODE */}
          {tabMode === 'month' && (
            <>
              <View style={styles.navHeader}>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => setViewYear((y) => y - 1)}
                >
                  <Ionicons name="chevron-back" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.navTitle}>{viewYear}</Text>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => setViewYear((y) => y + 1)}
                >
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.grid3}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const mKey = `${viewYear}-${pad2(m)}`;
                  const isSelected = mode === 'month' && value === mKey;
                  const isCurrent = currentMonthStr === mKey;
                  const hasData = availableMonths?.has(mKey);

                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.cell3,
                        isCurrent && styles.cellCurrent,
                        hasData && styles.cellHasData,
                        isSelected && styles.cellSelected,
                      ]}
                      onPress={() => {
                        onChange('month', mKey);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isSelected && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {monthNamesShort[m - 1]}
                      </Text>
                      {hasData && (
                        <View
                          style={[
                            styles.dot,
                            isSelected && { backgroundColor: '#fff' },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* YEAR MODE */}
          {tabMode === 'year' && (
            <>
              <View style={styles.navHeader}>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => setViewYear((y) => y - 12)}
                >
                  <Ionicons name="chevron-back" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
                <Text style={styles.navTitle}>
                  {yearList[0]} – {yearList[11]}
                </Text>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => setViewYear((y) => y + 12)}
                >
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.grid3}>
                {yearList.map((yr) => {
                  const yKey = String(yr);
                  const isSelected = mode === 'year' && value === yKey;
                  const isCurrent = today.getFullYear() === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.cell3,
                        isCurrent && styles.cellCurrent,
                        isSelected && styles.cellSelected,
                      ]}
                      onPress={() => {
                        onChange('year', yKey);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isSelected && { color: '#fff', fontWeight: '700' },
                        ]}
                      >
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Footer Shortcuts */}
          <View style={styles.footer}>
            {modes.includes('all') ? (
              <TouchableOpacity
                onPress={() => {
                  onChange('all', '');
                  onClose();
                }}
              >
                <Text style={styles.footerMuted}>{modeLabels.all}</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              onPress={() => {
                if (tabMode === 'day') {
                  onChange('day', todayStr);
                } else if (tabMode === 'year') {
                  onChange('year', String(today.getFullYear()));
                } else {
                  onChange('month', currentMonthStr);
                }
                onClose();
              }}
            >
              <Text style={styles.footerPrimary}>
                {tabMode === 'day'
                  ? language === 'vi'
                    ? 'Hôm nay'
                    : 'Today'
                  : tabMode === 'year'
                  ? language === 'vi'
                    ? 'Năm nay'
                    : 'This Year'
                  : language === 'vi'
                  ? 'Tháng này'
                  : 'This Month'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  modeTextActive: { color: COLORS.primary, fontWeight: '700' },

  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },

  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekCell: { width: '14.285%', alignItems: 'center', paddingVertical: 4 },
  weekText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.285%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  daySelected: { backgroundColor: COLORS.primary },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMain,
    textAlign: 'center',
    includeFontPadding: false,
  },
  dayTextMuted: { color: '#94a3b8' },
  dayTextToday: { color: COLORS.primary, fontWeight: '700' },
  dayTextSelected: { color: '#ffffff', fontWeight: '700' },

  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cell3: {
    width: '31%',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCurrent: { borderStyle: 'dashed', borderColor: COLORS.primary },
  cellHasData: { backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  cellSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cellText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
    marginTop: 3,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerMuted: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  footerPrimary: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
