import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import EventTimeline from './pages/EventTimeline';
import AdminQueue from './admin/AdminQueue';
import TweetQueue from './admin/TweetQueue';
import ConfigEditor from './admin/ConfigEditor';
import SituationMap from './pages/SituationMap';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/timeline" element={<EventTimeline />} />
        <Route path="/map" element={<SituationMap />} />
        <Route path="/admin/queue" element={<AdminQueue />} />
        <Route path="/admin/tweets" element={<TweetQueue />} />
        <Route path="/admin/config" element={<ConfigEditor />} />
      </Routes>
    </Layout>
  );
}
