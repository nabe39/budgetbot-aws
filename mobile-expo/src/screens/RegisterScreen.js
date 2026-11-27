import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GlassCard from '../components/GlassCard';
import { COLORS } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim() || !username.trim() || !password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const result = await register(fullName.trim(), username.trim(), password);
    if (result.success) {
      Alert.alert('Thành công', 'Tạo tài khoản thành công, vui lòng đăng nhập.');
      navigation.navigate('Login');
    } else {
      setError(result.error);
    }
  };

  return (
    <LinearGradient colors={COLORS.bgGradient} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <GlassCard style={styles.card}>
            <Text style={styles.logo}>💰 BudgetBot</Text>
            <Text style={styles.subtitle}>{t('auth.register_title')}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.label}>{t('auth.full_name')}</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('auth.full_name')}
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>{t('auth.username')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth.username')}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.label}>{t('auth.password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password')}
              secureTextEntry
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? t('auth.signing_up') : t('auth.signup_btn')}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.have_account')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>{t('auth.sign_in_link')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center' },
  card: { padding: 24 },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  errorText: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    color: COLORS.error,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 13,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textMain,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  linkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});
