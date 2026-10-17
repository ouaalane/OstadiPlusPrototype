import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import Overview from './pages/Overview';
import Courses from './pages/Courses';
import CourseEditor from './pages/CourseEditor';
import Students from './pages/Students';
import Reception from './pages/Reception';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseEditor />} />
        <Route path="students" element={<Students />} />
        <Route path="reception" element={<Reception />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
