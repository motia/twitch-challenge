import axios from 'axios';
import store from './store';

const parseCodeFromRedirect = ({ code, state }) => {
  if (!code) {
    return null;
  }

  // assert nonce stored in session
  if (!sessionStorage.twitchOAuthState) {
    throw new Error('Token mismatch');
  }

  // assert nonce of request is same of session
  if (`${sessionStorage.twitchOAuthState}` === `${state}`) {
    return code;
  }
  return null;
};

sessionStorage.lastAuthRefreshTimestamp = sessionStorage.lastAuthRefreshTimestamp || '';
async function obtainAccessToken(query) {
  const code = parseCodeFromRedirect(query);
  const { data: { accessToken, userName } } = await axios.post('api/auth', {
    code,
  });
  store.commit('updateUserConfig', {
    twitchOAuthToken: accessToken,
    userName,
  });
}

function logout() {
  store.commit('removeUserConfig');
}

async function refreshAuth() {
  const lastAuthRefreshTimestamp = (sessionStorage.lastAuthRefreshTimestamp || '')
    ? parseInt(sessionStorage.lastAuthRefreshTimestamp, 10)
    : null;
  if (
    Number.isNaN(lastAuthRefreshTimestamp) === false
    // 10 minuted since last refresh
    && (Date.now() - sessionStorage.lastAuthRefreshTimestamp) < (10 * 60 * 1000)) {
    return;
  }

  try {
    const { data: { accessToken, userName } } = await axios.post('/api/auth/refresh');
    store.commit('updateUserConfig', {
      twitchOAuthToken: accessToken,
      userName,
    });

    sessionStorage.lastAuthRefreshTimestamp = Date.now();
  } catch (e) {
    if (e.response && e.response.status === 401) {
      logout();
    }

    throw e;
  }
}

export default { obtainAccessToken, refreshAuth, logout };
