const Axios = require('axios');

const requestLogin = function (clientSecret, { clientId, redirectUri, grantType }, payload) {
    if (!clientId || !clientSecret) {
        throw new Error('Missing clientId or client secret')
    }
    if (!grantType) {
      throw new Error('Missing grant type');
    }

    if (!redirectUri) {
        throw new Error('Missing redirectUri');
    }

    return Axios.request({
        method: 'post',
        url: 'https://id.twitch.tv/oauth2/token',
        params: {
            ...payload,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: grantType,
        },
        headers: {
            Accept: 'application/json',
        }
    }).then(({ data }) => data)
        .catch(e => {
            throw 'Axios error';
        });
}

module.exports.login = function(clientSecret, { clientId, code, redirectUri }) {
    if (!code) {
        throw new Error('Missing auth code');
    }

    return requestLogin({ clientId, clientSecret }, { redirectUri, grantType: 'authorization_code' }, { code })
}


module.exports.refresh = function ({ clientSecret }, { clientId, redirectUri, refreshToken }) {
    if (!refreshToken) {
        throw new Error('Missing refreshToken');
    }
    return requestLogin(
        { clientId, clientSecret },
        { redirectUri, grantType: 'refresh_token' },
        { refresh_token: refreshToken }
    )
}
