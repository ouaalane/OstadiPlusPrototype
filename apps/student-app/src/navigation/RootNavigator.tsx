/**
 * Navigation root.
 *
 * • launch splash         → app mark, held until the stored session is ready
 * • no signed-in student  → sign-in stack
 * • otherwise             → 4 tabs + course / video / document screens
 */

import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import LaunchSplash from '../screens/LaunchSplash';
import OnboardingScreen from '../screens/OnboardingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import SignupScreen from '../screens/SignupScreen';
import SignInScreen from '../screens/SignInScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MyLearningScreen from '../screens/MyLearningScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import QnaScreen from '../screens/QnaScreen';
import VideoScreen from '../screens/VideoScreen';
import PdfScreen from '../screens/PdfScreen';
import ReaderScreen from '../screens/ReaderScreen';
import QuizScreen from '../screens/QuizScreen';
import StudentCardScreen from '../screens/StudentCardScreen';
import LessonAlerts from '../notifications/LessonAlertsBridge';
import { navigationRef } from './ref';
import { useStore } from '../store/StudentStore';
import { useI18n } from '../i18n/useI18n';
import { colors, familyFor, radius } from '../theme';
import type { AuthStackParamList, RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Learning: ['play-circle', 'play-circle-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  const { t, lang, dir } = useI18n();
  const rtl = dir === 'rtl';
  const insets = useSafeAreaInsets();

  const labels: Record<keyof TabParamList, string> = {
    Home: t('home'),
    Search: t('search'),
    Learning: t('my_learning'),
    Profile: t('profile'),
  };

  const screens: Record<keyof TabParamList, React.ComponentType> = {
    Home: HomeScreen,
    Search: SearchScreen,
    Learning: MyLearningScreen,
    Profile: ProfileScreen,
  };

  // Arabic mirrors the bar so «الرئيسية» sits on the right, as RTL users expect.
  const order: (keyof TabParamList)[] = rtl
    ? ['Profile', 'Learning', 'Search', 'Home']
    : ['Home', 'Search', 'Learning', 'Profile'];

  return (
    <Tab.Navigator
      /* The bar is mirrored for RTL, so the initial tab must be pinned —
         otherwise the reversed order would open the app on Profile. */
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 62 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 6),
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ color, focused }) => {
          const [active, inactive] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? active : inactive} size={21} color={color} />;
        },
      })}
    >
      {order.map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={screens[name]}
          options={{
            tabBarLabel: ({ focused, color }) => (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                  ...styles.tabLabel,
                  color,
                  fontFamily: familyFor(lang, focused ? 'bold' : 'medium'),
                }}
              >
                {labels[name]}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

/**
 * Pre-sign-in flow: onboarding → welcome → login (+ 6-digit code) / signup.
 * The demo account picker («PickAccount») stays reachable from Login/Signup
 * for testing.
 */
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false, animation: 'slide_from_left' }}
    >
      <AuthStack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            onSkip={() => props.navigation.navigate('Welcome')}
            onGetStarted={() => props.navigation.navigate('Welcome')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Welcome">
        {(props) => (
          <WelcomeScreen
            onLogin={() => props.navigation.navigate('Login')}
            onSignup={() => props.navigation.navigate('Signup')}
            onGuest={() => props.navigation.navigate('PickAccount')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            onBack={() => props.navigation.goBack()}
            onSignup={() => props.navigation.navigate('Signup')}
            onCodeSent={(email, studentId) =>
              props.navigation.navigate('VerifyCode', { email, studentId })
            }
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="VerifyCode">
        {(props) => (
          <VerifyCodeScreen
            email={props.route.params.email}
            studentId={props.route.params.studentId}
            onBack={() => props.navigation.goBack()}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Signup">
        {(props) => (
          <SignupScreen
            onBack={() => props.navigation.goBack()}
            onLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="PickAccount" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { hydrated, me, lang } = useStore();
  /* The launch image runs once per app start, in front of the navigators.
     Hydration happens concurrently behind it, so the splash simply waits for
     the stored session and then stands down — by the time it finishes, the app
     is guaranteed to have drawn its first real screen. */
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <LaunchSplash ready={hydrated} onFinish={() => setSplashDone(true)} />;
  }

  const theme = {
    ...DefaultTheme,
    colors: {
      primary: colors.brand,
      background: colors.canvas,
      card: colors.surface,
      text: colors.ink,
      border: colors.line,
      notification: colors.accent,
    },
    fonts: {
      regular: { ...DefaultTheme.fonts.regular, fontFamily: familyFor(lang, 'regular') },
      medium: { ...DefaultTheme.fonts.medium, fontFamily: familyFor(lang, 'medium') },
      bold: { ...DefaultTheme.fonts.bold, fontFamily: familyFor(lang, 'bold') },
      heavy: { ...DefaultTheme.fonts.heavy, fontFamily: familyFor(lang, 'bold') },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      {/* Puts teacher lesson alerts in the device's notification shade and opens
          the lesson when one is tapped. */}
      <LessonAlerts />
      {!me ? (
        <AuthNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
          <Stack.Screen name="Qna" component={QnaScreen} />
          <Stack.Screen name="Video" component={VideoScreen} />
          <Stack.Screen name="Pdf" component={PdfScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="StudentCard">
            {(props) => <StudentCardScreen onBack={() => props.navigation.goBack()} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabItem: {
    borderRadius: radius.md + 2,
    marginHorizontal: 4,
    marginBottom: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
