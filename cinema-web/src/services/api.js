const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

// Сессия хранится только в памяти вкладки, в localStorage ничего не попадает.
// После перезагрузки страницы она восстанавливается по httpOnly-cookie с refresh-токеном.
let session = null;
let refreshInFlight = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function send(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && session) headers.Authorization = `Bearer ${session.accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body && JSON.stringify(body),
      credentials: 'include',
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

export function setSession(newSession) {
  session = newSession;
}

// Загруженные постеры лежат на сервере API, а адрес в БД хранится относительным.
export function resolveImageUrl(url) {
  return url?.startsWith('/') ? API_URL.replace(/\/api$/, '') + url : url;
}

export function getSessionUser() {
  return session?.user ?? null;
}

// Обновляет сессию и возвращает пользователя, либо null, если войти заново не получилось.
// Параллельные вызовы используют один запрос: refresh-токен одноразовый.
export function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = send('/auth/refresh', { method: 'POST' })
      .then((data) => {
        session = data;
        return data.user;
      })
      .catch((error) => {
        if (error.status !== 401) throw error;
        session = null;
        return null;
      })
      .finally(() => {
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
  logout: () => request('/auth/logout', { method: 'POST' }),
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
