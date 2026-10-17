/**
 * Navigation root.
 *
 * • not hydrated yet      → brand splash
 * • no signed-in student  → sign-in stack
 * • otherwise             → 4 tabs + course / video / document screens
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import SignupScreen from '../screens/SignupScreen';
import SignInScreen from '../screens/SignInScreen';
import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import LibraryScreen from '../screens/LibraryScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import VideoScreen from '../screens/VideoScreen';
import PdfScreen from '../screens/PdfScreen';
import ReaderScreen from '../screens/ReaderScreen';
import QuizScreen from '../screens/QuizScreen';
import StudentCardScreen from '../screens/StudentCardScreen';
import { useStore } from '../store/StudentStore';
import { useI18n } from '../i18n/useI18n';
import { colors, familyFor, radius } from '../theme';
import type { AuthStackParamList, RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Courses: ['videocam', 'videocam-outline'],
  Downloads: ['download', 'download-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  const { t, lang, dir } = useI18n();
  const rtl = dir === 'rtl';

  const labels: Record<keyof TabParamList, string> = {
    Home: t('home'),
    Courses: t('courses'),
    Downloads: t('downloads'),
    Profile: t('profile'),
  };

  const screens: Record<keyof TabParamList, React.ComponentType> = {
    Home: HomeScreen,
    Courses: CoursesScreen,
    Downloads: DownloadsScreen,
    Profile: ProfileScreen,
  };

  // Arabic mirrors the bar so «الرئيسية» sits on the right, as RTL users expect.
  const order: (keyof TabParamList)[] = rtl
    ? ['Profile', 'Downloads', 'Courses', 'Home']
    : ['Home', 'Courses', 'Downloads', 'Profile'];

  return (
    <Tab.Navigator
      /* The bar is mirrored for RTL, so the initial tab must be pinned —
         otherwise the reversed order would open the app on Profile. */
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.brandSofter,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: {
          ...styles.tabLabel,
          fontFamily: familyFor(lang, 'semibold'),
        },
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
          options={{ tabBarLabel: labels[name] }}
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
  const { hydrated, me } = useStore();

  if (!hydrated) {
    return <SplashScreen />;
  }

  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: colors.canvas },
  };

  return (
    <NavigationContainer theme={theme}>
      {!me ? (
        <AuthNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
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
    height: 66,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  tabItem: {
    borderRadius: radius.md + 2,
    marginHorizontal: 4,
    marginBottom: 2,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
