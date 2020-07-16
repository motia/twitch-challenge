# Intro
## The frontend
As we will use the twitch chat and video embeds and we will not need any more data. We can use a simple implicit flow. This way I can be flexible in the UI/UX and can create the website into pages.
-	First page: includes a form with a required input of the channel name and a submit button that starts the Oauth procedure with Twitch.
-	Second page: includes the embeds and a widget that shows the newest 10 events received via a websocket to the backend.

## Events list:
As the list of events that should be displayed in the widget. I have checked the possible events and assumed them relevance.
The twitch events are provided through this different channels:
- Chat widget: shows chat, whispers, moderating events, cheers, etc...
- PubSub API: the events are already displayed in the chat widget, thus I will not use it
- Webhook API: provides events for stream, user change and streamer follows, will be delivered using websockets as per specs.

## Backend: 
Per specs, we need a websockets server which pushes the channel events to users subscribed to it.
Considering that the events are provided using the Webhooks API we will need a public endpoint that receives the webhooks.
Summing up all the previous points, I propose the architecture in the attached chart.
  
# Deployment to AWS
Using a Git monorepo on Github (Gitlab and Bitbucket are fine too) which contains all the code. 
The build system; Github Actions in this case, will test, build and deploy the different services.
## Frontend:
A simple frontend application. (I used a simple vuejs SPA)
The website can be simply deployed to S3 and additionally Cloudfront

# Scaling:
For scaling, we will have to switch to a serverless architecture.
This approach will be easier to scale as we won't have to manage servers.

It should be simple to migrate to the other architecture as the current code has as I split the code to map into AWS service units and separated the infrastructure from the logic.

## Subscription
Clean up subscriptions


## The services implementation in AWS
- Websockets server Interface: AWS API gateway websockets
- Webhook Subscriptions Service: AWS Lambda
- Webhook Server: AWS Lambda with public access
- Authentication: either as a Lambda or using AWS Cognito with the Twitch OpenId as a user pool.

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

For deployment and configuration we can use Serverless (https://www.serverless.com).

> The queries to insert and search the events are in the events table are in /backend/src/EventsRepository.ts
