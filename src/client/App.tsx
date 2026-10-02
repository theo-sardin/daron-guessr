import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { Background } from './components/Background';
import { Toaster } from './components/Toast';
import { TopBar } from './components/TopBar';
import { useI18n } from './i18n';
import { useRoute } from './lib/router';
import { HomeScreen } from './screens/home/HomeScreen';
import { RoomScreen } from './screens/RoomScreen';

// Dev-only screen gallery; the dynamic import is dropped from production builds.
const PreviewApp = import.meta.env.DEV ? lazy(() => import('./dev/PreviewApp').then((m) => ({ default: m.PreviewApp }))) : null;
const isPreview = () => PreviewApp !== null && window.location.pathname.startsWith('/__preview');

export function App() {
  const route = useRoute();
  const { lang } = useI18n();

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <MotionConfig reducedMotion="user">
      <Background />
      <TopBar />
      <Toaster />
      {isPreview() && PreviewApp ? (
        <Suspense fallback={null}>
          <PreviewApp />
        </Suspense>
      ) : route.name === 'room' ? (
        <RoomScreen key={route.code} code={route.code} />
      ) : (
        <HomeScreen />
      )}
    </MotionConfig>
  );
}
