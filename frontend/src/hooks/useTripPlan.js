import { useState } from 'react';
import { planTrip } from '../api/tripApi';

/**
 * Encapsulates all trip planning state and async logic.
 * Returns the state machine + action handlers consumed by App.jsx.
 */
export function useTripPlan() {
  const [state, setState]       = useState('idle'); // 'idle' | 'loading' | 'results' | 'error'
  const [tripData, setTripData] = useState(null);
  const [tripInput, setTripInput] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function plan(formData) {
    setState('loading');
    setErrorMsg('');
    setTripInput(formData);
    try {
      const data = await planTrip(formData);
      setTripData(data);
      setState('results');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'An unexpected error occurred.';
      setErrorMsg(String(msg));
      setState('error');
    }
  }

  function reset() {
    setTripData(null);
    setTripInput(null);
    setErrorMsg('');
    setState('idle');
  }

  return { state, tripData, tripInput, errorMsg, plan, reset };
}
