import TwitchClient, { StaticAuthProvider } from 'twitch';
import { IWebhooksSubscriber } from './types';
import { SubscriptionsRepository } from './SubscriptionsRepository';

export interface AppSession {
  userName?: string,
  refreshToken?: string,
  startedAt?: string,
  favoriteStreamerUserName?: string,
}

type EndpointResponse = Promise<{
  status: 400 | 200 | 401 | 500,
  data: {[k: string]: string | boolean | number },
  session?: AppSession
}>

export const handleAuthCode = async function ({
    code,
  }: {code: string},
{ TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_REDIRECT_URI }: {
  TWITCH_CLIENT_ID: string,
  TWITCH_REDIRECT_URI: string
  TWITCH_CLIENT_SECRET: string}): EndpointResponse {
  if (!code) {
    return { status: 400, data: { error: 'Missing code' } };
  }
  const token = await TwitchClient.getAccessToken(
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    code,
    TWITCH_REDIRECT_URI,
  ).catch(e => {
    return null;
  });

  if (!token) {
    return { status: 401, data: { error: 'Login failed' } };
  }
  const { accessToken, refreshToken } = token ?? { accessToken: null, refreshToken: null };

  const client = new TwitchClient({
    authProvider: new StaticAuthProvider(TWITCH_CLIENT_ID, accessToken),
  });
  const user = await client.helix.users.getMe(false).catch(e => {
    console.error('Could not fetch user..');
    return null;
  });

  if (!user) {
    return { status: 401, data: { error: 'Login failed' } };
  }

  return { 
    status: 200, 
    data: { userName: user.name, accessToken },
    session: {
      userName: user.name,
      refreshToken,
      startedAt: new Date().toISOString()
    }
  };
};

export const handleSubscribe = async function(
  webhookSubscriber: IWebhooksSubscriber,
  {
    userName,
    favoriteStreamerUserName
  }: {
    userName?: string,
    favoriteStreamerUserName?: string  
  }): EndpointResponse {
  if (!userName) {
    return  { status: 401, data: {error: 'Unauthenticated'} };
  }

  if (!favoriteStreamerUserName || !isNaN(parseInt(`${favoriteStreamerUserName}`))) {
    return { status: 400, data: { error: 'favoriteStreamerUserName should be the login'} };
  }
  const eventSubscription = await webhookSubscriber.subscribe({
    userName,
    streamerName: favoriteStreamerUserName
  }).catch(e => {
    console.error(e);
  });

  if (!eventSubscription) {
    return { status: 500, data: { error: 'Subscription failed' } };
  }

  const session = {
    favoriteStreamerUserName,
  };

  const data = {
    favoriteStreamerUserName,
    channelSubscriptionId: eventSubscription.id,
    channelSubscriptionSecret: eventSubscription.secret,
  };

  return {
    status: 200,
    data,
    session,
  };
};

export const handleRemoveSubscription = async function (
  webhookSubscriber: IWebhooksSubscriber,
  channelSubscriptionId: string,
): EndpointResponse {
  if (channelSubscriptionId) {
    void webhookSubscriber.removeSubscription(channelSubscriptionId);
  }

  return { status: 200, data: {} };
};

export const handleRefreshToken = async function ({
  refreshToken,
  userName
}: AppSession, {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
}: {
  TWITCH_CLIENT_ID: string,
  TWITCH_CLIENT_SECRET: string,
}): EndpointResponse {
  if (!refreshToken || !userName) {
    return {
      status: 401,
      data: { error: 'Unauthenticated' }
    };
  }

  const token = await TwitchClient.refreshAccessToken(
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    refreshToken
  );
  if (!token) {
    return {
      status: 401,
      data: { error: 'Unauthenticated' }
    };
  }

  return {
    status: 200,
    data: {
      userName,
      accessToken: token.accessToken
    },
    session: {
      refreshToken: token.refreshToken
    }
  };
};


export const handleSubscriptionAuthorization = async function(
  {id, secret}: {id: string | null, secret: string | null},
  subscriptionRepository: SubscriptionsRepository
): EndpointResponse {
  if (!id || !secret) {
    return { status: 400, data: { error: 'Missing secret or id' } };
  }
  const subscription = await subscriptionRepository.findSubscription(id);

  if (secret && subscription && subscription?.secret === secret) {
    return { data: { authorized: true, streamerName: subscription.streamerName }, status: 200 };
  }

  return { data: { authorized: false }, status: 200 };
};