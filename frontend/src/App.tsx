import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LearnPage } from './pages/LearnPage';
import { LessonPage } from './pages/LessonPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaygroundPage } from './pages/PlaygroundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:slug" element={<LessonPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
