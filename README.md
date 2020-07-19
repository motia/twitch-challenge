# Intro
## The frontend
As we will use the twitch chat and video embeds and we will not need any more data. We can use a simple implicit flow. This way I can be flexible in the UI/UX and can create the website into pages.
-	First page: includes a form with a required input of the channel name and a submit button that starts the Oauth procedure with Twitch.
-	Second page: includes the embeds and a widget that shows the newest 10 events received via a websocket to the backend.

## Events list:
As the list of events that should be displayed in the widget. We have three sources:
- IRC: shows chat, whispers, moderating events, cheers, subscriptions, etc...
- PubSub API: the events are already displayed in the chat widget, thus I will not use it
- Webhook API: provides events for stream changes, user changes and streamer follows.

I will assume these are the events we need to track:
- stream changes: tracked from webhooks
- user changes: tracked from webhooks
- streamer follows: tracked from webhooks
- subscriptions: tracked from IRC

As we will have to store the events in DB, the IRC should be tracked by BOT.

## Authentication and Session
The session should persist for 7 days. This is longer then the life time of Twitch access tokens.
Hence, we will need to use a refresh token using OAuth.
Basically, the refresh token will be persisted in our session. And the user can request access tokens to use them in direct Twitch Api requests.
The server will delete the session including the refresh token after 7 days of user inactivity.

## Backend: 
Per specs, we need a websockets server which pushes the channel events to users subscribed to it.
Considering that the events are provided using the Webhooks API we will need a public endpoint that receives the webhooks.


| Summing up all the previous points, I suggest the following architecture:

![System architecture](/architecture.png)
  
# Deployment to AWS
As scaling to up to 900MM reqs/day in 6 months. We will need to adopt a microservice architecture or a serverlless one as soon as possible. Therfore, I considered separtation concerns in the code, so it is possible to deploy the services without changing the code.

Therefore, I have detailed to steps for the deployment.

## Step 1: vertical scaling on EC2
For starters, we will need to deploy our code quickl and without worrying much about the CI/CD and adjusting it to scaling. 
As the backend is split into services, a service for each block in the architcture diagram.
We can host the backend on an EC2 instance and manage vertical scale it as needed. We will mange the for deployment and process management PM2.

For the frontend, as it is a static web app, we can host it in S3 (then optionally setup CloudFront for it).

## Step2: Switching to serverless
Next, have to switch to a serverless architecture. This approach will be easier as we will not have to manage servers or customize our toolchain.

By design, the services can be used

## The services implementation in AWS
- Websockets server Interface: AWS API gateway websockets
- Webhook Subscriptions Service: AWS Lambda
- Webhook Server: AWS Lambda with public access
- Public API: using AWS Lambda with DynamoDB for session. Also, AWS Cognito with the Twitch OpenId as a user pool might be an option.
- IRC bots: the bots must stay connected as long as we have subscriptions to channels. Hence we will always have working servers. We can use Elastic Load Balancing with autoscaled EC2 instances for this service.

## Scaling the database
The `events` table which can grow large because of many inserts. As the records are timestamped, we can shard the table by partition the table by range(`created_at ASC`, `streamer_name`, `event_type`).

Also, as these table will be readonly (the new events are always added with `created_at` as the current timestamp, hence added into another table), we can add a table `events_${MAX_TIMESTAMP}` with the columns (`streamer_name`, `event_type`, `event_count`).
 
With this design, the desired count queries can be computed by summing the counts of relevant events in the archive tables and the result of the query of their count in the.
For example, the count of events for the user `A` when we have the archived tables `events_1000`, `events_2000` and the current table `events_3000`:

```
select (
  select SUM(archived_events_1000.event_count) WHERE streamer_name = 'A') 
  + (select SUM(archived_events_2000.event_count) WHERE streamer_name = 'A') 
  + (select COUNT(events_3000.id) WHERE streamer_name = 'A')
)
``` 

## Deployment
For deployment and configuration we can use Serverless (https://www.serverless.com).

# Queries
The queries to insert and search the events are in the events table are in both of /queries.sql and /backend/src/EventsRepository.ts
