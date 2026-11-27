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

const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const MONTHS_EN = [
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

export default function DatePickerModal({
  visible,
  value,
  onSelect,
  onClear,
  onClose,
  language = 'vi',
  showClear = true,
}) {
  const today = useMemo(() => new Date(), []);
  const todayStr = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    if (!visible) return;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [visible, value, today]);

  const cells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const list = [];
    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      list.push({
        day,
        iso: toIsoDate(prevY, prevM, day),
        inMonth: false,
      });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({
        day: d,
        iso: toIsoDate(viewYear, viewMonth, d),
        inMonth: true,
      });
    }
    // Trailing days to complete 6 rows (42 cells) or 5 rows (35 cells)
    const totalNeeded = list.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (list.length < totalNeeded) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      list.push({
        day: nextDay,
        iso: toIsoDate(nextY, nextM, nextDay),
        inMonth: false,
      });
      nextDay += 1;
    }
    return list;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const weekdays = language === 'vi' ? WEEKDAYS_VI : WEEKDAYS_EN;
  const monthLabel =
    language === 'vi'
      ? `${MONTHS_VI[viewMonth]} ${viewYear}`
      : `${MONTHS_EN[viewMonth]} ${viewYear}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Header Month/Year + Arrows */}
          <View style={styles.header}>
            <Text style={styles.monthTitle}>{monthLabel}</Text>
            <View style={styles.arrows}>
              <TouchableOpacity style={styles.arrowBtn} onPress={goPrevMonth}>
                <Ionicons name="arrow-up" size={16} color={COLORS.textMain} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.arrowBtn} onPress={goNextMonth}>
                <Ionicons name="arrow-down" size={16} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekRow}>
            {weekdays.map((wd) => (
              <View key={wd} style={styles.weekCell}>
                <Text style={styles.weekText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.grid}>
            {cells.map((cell) => {
              const isSelected = value === cell.iso;
              const isToday = todayStr === cell.iso;
              return (
                <TouchableOpacity
                  key={cell.iso}
                  style={styles.dayCell}
                  onPress={() => {
                    onSelect(cell.iso);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isToday && !isSelected && styles.dayCellToday,
                      isSelected && styles.dayCellSelected,
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

          {/* Footer: Clear & Today */}
          <View style={styles.footer}>
            {showClear ? (
              <TouchableOpacity
                onPress={() => {
                  onClear?.();
                  onClose();
                }}
              >
                <Text style={styles.footerLink}>
                  {language === 'vi' ? 'Xóa' : 'Clear'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity
              onPress={() => {
                onSelect(todayStr);
                onClose();
              }}
            >
              <Text style={styles.footerLink}>
                {language === 'vi' ? 'Hôm nay' : 'Today'}
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
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textMain },
  arrows: { flexDirection: 'row', gap: 6 },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerLink: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
