import { Routes, Route, Outlet } from 'react-router-dom';
import { ConflictProvider } from './contexts/ConflictContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import TimelinePage from './pages/TimelinePage';
import AdminQueue from './admin/AdminQueue';
import TweetQueue from './admin/TweetQueue';
import ConfigEditor from './admin/ConfigEditor';
import MapWithTimeline from './pages/MapWithTimeline';
import OptionView from './pages/OptionView';
import ThresholdView from './pages/ThresholdView';
import ScenarioView from './pages/ScenarioView';
import PerspectivesView from './pages/PerspectivesView';
import MarketView from './pages/MarketView';

function ConflictLayout() {
  return (
    <ConflictProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ConflictProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ConflictLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/map" element={<MapWithTimeline />} />
        <Route path="/options" element={<OptionView />} />
        <Route path="/thresholds" element={<ThresholdView />} />
        <Route path="/scenarios" element={<ScenarioView />} />
        <Route path="/perspectives" element={<PerspectivesView />} />
        <Route path="/market" element={<MarketView />} />
        <Route path="/admin/queue" element={<AdminQueue />} />
        <Route path="/admin/tweets" element={<TweetQueue />} />
        <Route path="/admin/config" element={<ConfigEditor />} />
      </Route>
    </Routes>
  );
}
