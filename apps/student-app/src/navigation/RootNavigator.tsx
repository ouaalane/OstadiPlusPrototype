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
import SignInScreen from '../screens/SignInScreen';
import HomeScreen from '../screens/HomeScreen';
import CoursesScreen from '../screens/CoursesScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseDetailScreen from '../screens/CourseDetailScreen';
import VideoScreen from '../screens/VideoScreen';
import PdfScreen from '../screens/PdfScreen';
import { useStore } from '../store/StudentStore';
import { colors, fonts } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Courses: ['book', 'book-outline'],
  Announcements: ['megaphone', 'megaphone-outline'],
  Profile: ['person', 'person-outline'],
};

const TAB_LABELS: Record<keyof TabParamList, string> = {
  Home: 'الرئيسية',
  Courses: 'دوراتي',
  Announcements: 'الإعلانات',
  Profile: 'ملفي',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const [active, inactive] = TAB_ICONS[route.name as keyof TabParamList];
          return <Ionicons name={focused ? active : inactive} size={21} color={color} />;
        },
      })}
    >
      {(Object.keys(TAB_LABELS) as (keyof TabParamList)[]).map((name) => (
        <Tab.Screen
          key={name}
          name={name}
          component={
            name === 'Home'
              ? HomeScreen
              : name === 'Courses'
                ? CoursesScreen
                : name === 'Announcements'
                  ? AnnouncementsScreen
                  : ProfileScreen
          }
          options={{ tabBarLabel: TAB_LABELS[name] }}
        />
      ))}
    </Tab.Navigator>
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
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={SignInScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
          <Stack.Screen name="Video" component={VideoScreen} />
          <Stack.Screen name="Pdf" component={PdfScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
});
