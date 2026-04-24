import './index.css';

import { useTripPlan } from './hooks/useTripPlan';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import TripPlannerPage from './pages/TripPlannerPage';

export default function App() {
  const tripPlan = useTripPlan();

  return (
    <div className="min-h-screen">
      <Header
        onNewTrip={tripPlan.reset}
        showNewTrip={tripPlan.state === 'results' || tripPlan.state === 'error'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <TripPlannerPage {...tripPlan} />
      </main>

      <Footer />
    </div>
  );
}


