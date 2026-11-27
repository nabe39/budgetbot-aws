import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassCard from '../components/GlassCard';
import { COLORS } from '../theme';

export default function PlaceholderScreen({ title, description, endpoints }) {
  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.title}>{title}</Text>
        <GlassCard>
          <Text style={styles.desc}>{description}</Text>
          <Text style={styles.label}>API Backend tương ứng:</Text>
          <Text style={styles.endpoints}>{endpoints}</Text>
        </GlassCard>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textMain, marginBottom: 16 },
  desc: { fontSize: 14, color: COLORS.textMain, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4 },
  endpoints: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '600' },
});
