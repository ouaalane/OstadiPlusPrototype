import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Learning: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  VerifyCode: { email: string; studentId?: string };
  Signup: undefined;
  PickAccount: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Tabs: NavigatorScreenParams<TabParamList>;
  CourseDetail: { courseId: string };
  Qna: { courseId: string; lessonId?: string };
  Video: { lessonId: string };
  Pdf: { lessonId: string };
  Reader: { lessonId: string };
  Quiz: { lessonId: string };
  Library: undefined;
  StudentCard: undefined;
  EditProfile: undefined;
  Sync: undefined;
};
