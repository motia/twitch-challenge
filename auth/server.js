const express = require('express');
const bodyParser = require('body-parser');
const twitchAuth = require('./twitchAuth');
const morgan = require('morgan')

require('dotenv').config();

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json());

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  throw new Error('Invalid twitch secrets')
}

const handleLogin = function (authenticate, data)
{
  if (!data.clientId || TWITCH_CLIENT_ID !== data.clientId) {
    return { status: 403, data: { error: 'Unauthorized client ID' } }
  }
  const errors = Object.keys(data).filter(x => !data[x]);

  if (errors.length) {
    return { status: 400, data: { error: 'Required paramerters: ' + errors.join(', ') }};
  }

  return authenticate(
    TWITCH_CLIENT_SECRET,
    twitchCrendentials,
    { code, redirectUri, clientId }
  )
    .then(data => { status, data })
    .catch(e => ({ status: 401, data: { error: 'Authentication failed' } }));
};

app.post('/api/auth', async function (req, res) {
  const { code, redirectUri, clientId } = req.body;

  const { status, data } = await handleLogin(twitchAuth.login, {code, redirectUri, clientId});

  res.status(status).json(data)
});

app.post('/api/auth/refresh', async function (req, res) {
  const { refreshToken, redirectUri, clientId } = req.body;

  const { status, data } = await handleLogin(twitchAuth.refresh, { refreshToken, redirectUri, clientId });
  res.status(status).json(data);
});


const PORT = process.env.PORT || 9005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TwitchAuth] server is listening on ${PORT}`);
});
