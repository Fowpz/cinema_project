import { api, getSessionUser, refreshSession, setSession } from './api';

export async function getCurrentUser() {
  return getSessionUser() ?? (await refreshSession());
}

export async function signIn(login, password) {
  const session = await api.login(login, password);
  await setSession(session);
  return session.user;
}

export async function signUp(name, login, password) {
  const session = await api.register(name, login, password);
  await setSession(session);
  return session.user;
}

export async function signOut() {
  try {
    await api.logout();
  } finally {
    await setSession(null);
  }
}
