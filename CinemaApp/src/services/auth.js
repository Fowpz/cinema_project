import AsyncStorage from '@react-native-async-storage/async-storage';
const AUTH_TOKEN_KEY = 'cinema_auth_token';
const AUTH_USER_KEY = 'cinema_auth_user';
export async function saveSession(session) {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, session.token],
    [AUTH_USER_KEY, JSON.stringify(session.user)],
  ]);
}
export async function loadSession() {
  const pairs = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  const token = pairs[0][1];
  const userJson = pairs[1][1];
  if (!token || !userJson) return null;
  try {
    return { token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}
export async function clearSession() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}
