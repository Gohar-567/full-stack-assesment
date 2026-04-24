import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

export async function planTrip(data) {
  const response = await axios.post(`${API_BASE}/api/trip/plan`, data, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  });
  return response.data;
}

export async function autocompleteAddress(query) {
  const response = await axios.get(`${API_BASE}/api/trip/autocomplete`, {
    params: { q: query },
  });
  return response.data || [];
}
