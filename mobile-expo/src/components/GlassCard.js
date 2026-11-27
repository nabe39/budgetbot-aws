import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS } from '../theme';

export default function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glassCard,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#1f2687',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
});
