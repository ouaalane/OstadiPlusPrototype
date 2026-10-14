import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Courses: undefined;
  Announcements: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  CourseDetail: { courseId: string };
  Video: { lessonId: string };
  Pdf: { lessonId: string };
};
