import * as morgan from 'morgan';
import { handleAuthCode, handleSubscribe, handleRemoveSubscription, handleRefreshToken, AppSession, handleSubscriptionAuthorization } from '../appEndpoints';
import * as express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import { IStartableService, IWebhooksSubscriber, ISubscriptionGuard } from '../types';
import { Server } from 'http';
import axios from 'axios';
import { SubscriptionsRepository } from '../SubscriptionsRepository';
import FileStore1 = require('session-file-store');

const FileStore = FileStore1(session);

export const createSubscriptionGuard = (
    WEBSERVER_PORT: number,
  ): ISubscriptionGuard => {
  return {
    async authorizeSubscription({
      subscriptionSecret,
      subscriptionId,
    }): Promise<{ authorized: false; } | { streamerName: string; authorized: true; }> {
      try {
        const {data} = await axios.request<{streamerName: string}>({
          method: 'GET',
          baseURL: `http://localhost:${WEBSERVER_PORT}`,
          url: `subscriptions/authorize?secret=${subscriptionSecret}&id=${subscriptionId}`
        });
        const streamerName = data.streamerName;
    
        return { authorized: true, streamerName };
      } catch(e) {
        return { authorized: false };
      }
    }
  };
};

export const createWebServer = function(
  webhookSubscriber: IWebhooksSubscriber,
  subscriptionRepository: SubscriptionsRepository,
{ 
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI,
  WEBSERVER_PORT
}: {
  WEBSERVER_PORT: number,
  TWITCH_CLIENT_ID: string,
  TWITCH_CLIENT_SECRET: string,
  TWITCH_REDIRECT_URI: string
}): IStartableService {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_REDIRECT_URI) {
    throw new Error('Invalid twitch secrets');
  }

  const app = express();
  app.use(morgan('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true,
  }));
  
  app.use(session({
  store: new FileStore({}),
    secret: process.env.SESSION_SECRET || 'keyboard cat', // TODO: env
    cookie: { maxAge: 7 * 24 * 3600 * 1000 },
    resave: false,
    saveUninitialized: true,
  }));
  
  app.post('/api/auth', async (req: express.Request<any, any, {code: string}>, res) => {
    const { session, data, status } = await handleAuthCode({
      code: req.body.code,
    }, {
      TWITCH_CLIENT_ID,
      TWITCH_CLIENT_SECRET,
      TWITCH_REDIRECT_URI,
    });
  
    updateRequestSession(req, session);
  
    return res.status(status).json(data);
  });

  // TODO: move to a separate service
  // authorize websockets
  app.get('/subscriptions/authorize', async function (req, res) {
    const { status, data } = await handleSubscriptionAuthorization({
      secret: req.query.secret as string,
      id: req.query.id as string,
    }, subscriptionRepository);

    return res.status(status).json(data);
  });
  
  app.put('/api/subscription', async function(
    req: express.Request<any, any, { favoriteStreamerUserName: string}>,
    res
  ) {
    const { session, data, status } = await handleSubscribe(
      webhookSubscriber,
      {
        userName: (req.session as AppSession).userName,
        favoriteStreamerUserName: req.body.favoriteStreamerUserName
      }
    );
  
    updateRequestSession(req, session);
  
    return res.status(status).json(data);
  });

  app.delete('/api/subscription', async (req, res) => {
    const {status, data} = await handleRemoveSubscription(
      webhookSubscriber, 
      (req.body as { subscriptionId: string }).subscriptionId
    );
    req.session?.destroy(() => {});
  
    return res.status(status).json(data);
  });
  
  app.post('/api/auth/refresh', async (req, res) => {
    const {status, data, session} = await handleRefreshToken((req.session as AppSession), {
      TWITCH_CLIENT_SECRET,
      TWITCH_CLIENT_ID
    });
  
    updateRequestSession(req, session);

    return res.status(status).json(data);
  });

  let _server: Server;
  return {
    async start() {
      _server =  app.listen(WEBSERVER_PORT, '0.0.0.0', () => {
        console.log(`[TwitchAuth] server is listening on ${WEBSERVER_PORT}`);
      });
    },
    close: async function () {_server?.close();}
  };
};


function updateRequestSession(req: Express.Request, session: AppSession | undefined) {
  const reqSession = req.session as AppSession;
  if (session) {
    Object.keys(session).forEach(k => {
      if (session[k] === undefined) {
        delete reqSession[k];
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reqSession[k] = session[k];
      }
    });
  }
}

