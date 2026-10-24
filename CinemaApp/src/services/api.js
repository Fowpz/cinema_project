import { Platform } from 'react-native';
const API_URL = Platform.select({
  web: 'http://localhost:4000/api',
  default: 'http://10.104.174.182:4000/api',
});
class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function request(path, options) {
  const { headers, ...requestOptions } = options || {};
  const res = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new ApiError(data?.error || 'Ошибка запроса', res.status);
  }
  return data;
}
export const api = {
  getSchedule: (date) => request(`/schedule?date=${date}`),
  getMovie: (id) => request(`/movies/${id}`),
  getShowtime: (id) => request(`/showtimes/${id}`),
  getSeats: (showtimeId) => request(`/showtimes/${showtimeId}/seats`),
  bookTickets: (token, payload) =>
    request(`/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getMyTickets: (token) =>
    request('/tickets/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getCurrentUser: (token) =>
    request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  register: (name, login, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, login, password }),
    }),
  login: (login, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  getAdminHalls: (token) =>
    request('/admin/halls', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAdminMovies: (token) =>
    request('/admin/movies', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createShowtime: (token, movieId, showtime) =>
    request('/admin/showtimes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ movieId, ...showtime }),
    }),
  createMovie: (token, movie) =>
    request('/admin/movies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(movie),
    }),
};
export { ApiError };
