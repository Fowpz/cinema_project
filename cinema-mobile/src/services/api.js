import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'cinema_refresh_token';

// Телефон обращается к API по адресу компьютера, на котором запущен Metro.
const hostUri = Constants.expoConfig?.hostUri;
const packagerHost = hostUri?.slice(0, hostUri.lastIndexOf(':'));
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  `http://${packagerHost || 'localhost'}:4000/api`;

// Access-токен лежит только в памяти, refresh-токен — в защищённом хранилище устройства.
let session = null;
let refreshInFlight = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function send(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'X-Client-Type': 'mobile' };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && session) headers.Authorization = `Bearer ${session.accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Сервер недоступен', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new ApiError(data?.error || 'Ошибка запроса', res.status);
  }
  return data;
}

export async function setSession(newSession) {
  if (newSession) {
    const { refreshToken, ...current } = newSession;
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    session = current;
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    session = null;
  }
}

// Загруженные постеры лежат на сервере API, а адрес в БД хранится относительным.
export function resolveImageUrl(url) {
  return url?.startsWith('/') ? API_URL.replace(/\/api$/, '') + url : url;
}

export function getSessionUser() {
  return session?.user ?? null;
}

async function runRefresh() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const data = await send('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    await setSession(data);
    return data.user;
  } catch (error) {
    if (error.status !== 401) throw error;
    await setSession(null);
    return null;
  }
}

// Обновляет сессию и возвращает пользователя, либо null, если войти заново не получилось.
// Параллельные вызовы используют один запрос: refresh-токен одноразовый.
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Access-токен живёт 15 минут: при 401 один раз обновляем его и повторяем запрос.
async function request(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    if (!options.auth || error.status !== 401) throw error;
    if (!(await refreshSession())) throw error;
    return send(path, options);
  }
}

export const api = {
  getSchedule: (date) => request(`/schedule?date=${date}`),
  getMovie: (id) => request(`/movies/${id}`),
  getShowtime: (id) => request(`/showtimes/${id}`),
  getSeats: (showtimeId) => request(`/showtimes/${showtimeId}/seats`),
  bookTickets: (payload) =>
    request('/tickets', { method: 'POST', auth: true, body: payload }),
  getMyOrders: () => request('/tickets/me', { auth: true }),
  register: (name, login, password) =>
    request('/auth/register', {
      method: 'POST',
      body: { name, login, password },
    }),
  login: (login, password) =>
    request('/auth/login', { method: 'POST', body: { login, password } }),
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return request('/auth/logout', { method: 'POST', body: { refreshToken } });
  },
  getAdminHalls: () => request('/admin/halls', { auth: true }),
  getAdminMovies: () => request('/admin/movies', { auth: true }),
  getAdminShowtimes: (date) =>
    request(`/admin/showtimes?date=${date}`, { auth: true }),
  deleteShowtime: (id) =>
    request(`/admin/showtimes/${id}`, { method: 'DELETE', auth: true }),
  createShowtime: (movieId, showtime) =>
    request('/admin/showtimes', {
      method: 'POST',
      auth: true,
      body: { movieId, ...showtime },
    }),
  createMovie: (movie) =>
    request('/admin/movies', { method: 'POST', auth: true, body: movie }),
};
