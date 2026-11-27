import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OverviewScreen from '../screens/OverviewScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Overview: { active: 'pie-chart', inactive: 'pie-chart-outline' },
  Transactions: { active: 'list', inactive: 'list-outline' },
  Chat: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  Coach: { active: 'bulb', inactive: 'bulb-outline' },
  Limits: { active: 'notifications', inactive: 'notifications-outline' },
};

function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.floatingWrapper, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.pillContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconPair = TAB_ICONS[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || options.title}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.8}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Ionicons
                name={isFocused ? iconPair.active : iconPair.inactive}
                size={24}
                color={isFocused ? COLORS.primary : COLORS.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TransactionsTab() {
  const { t } = useLanguage();
  return (
    <PlaceholderScreen
      title={t('nav.transactions')}
      description="Màn hình danh sách giao dịch, lọc theo tháng/danh mục, hiển thị badge độ tin cậy NLP (high/medium/low) và thêm/sửa/xóa giao dịch."
      endpoints="GET /transactions, POST /transactions, PUT /transactions/{id}, DELETE /transactions/{id}"
    />
  );
}

function ChatTab() {
  const { t } = useLanguage();
  return (
    <PlaceholderScreen
      title={t('nav.ask_ai')}
      description="Trợ lý hỏi đáp chi tiêu RAG & ghi nhận giao dịch bằng ngôn ngữ tự nhiên."
      endpoints="POST /chat, POST /chat/transaction"
    />
  );
}

function CoachTab() {
  const { t } = useLanguage();
  return (
    <PlaceholderScreen
      title={t('nav.budget_coach')}
      description="Phân tích thói quen chi tiêu và đưa ra gợi ý tiết kiệm cá nhân hóa."
      endpoints="GET /coach"
    />
  );
}

function LimitsTab() {
  const { t } = useLanguage();
  return (
    <PlaceholderScreen
      title={t('nav.caps_alerts')}
      description="Thiết lập hạn mức chi tiêu hàng tháng theo từng danh mục và cảnh báo vượt ngưỡng 80% / 100%."
      endpoints="GET /caps, POST /caps, DELETE /caps/{category}"
    />
  );
}

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} options={{ title: t('nav.overview') }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ title: t('nav.transactions') }} />
      <Tab.Screen name="Chat" component={ChatTab} options={{ title: t('nav.ask_ai') }} />
      <Tab.Screen name="Coach" component={CoachTab} options={{ title: t('nav.budget_coach') }} />
      <Tab.Screen name="Limits" component={LimitsTab} options={{ title: t('nav.caps_alerts') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
  },
});
