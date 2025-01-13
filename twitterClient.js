import { TwitterApi } from 'twitter-api-v2';

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.CONSUMER_KEY,
  appSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const bearer = new TwitterApi(process.env.BEARER_TOKEN);

// Twitter client with read/write and read-only access
const twitterClient = client.readWrite;
const twitterBearer = bearer.readOnly;

// Export the clients as default
export default { twitterClient, twitterBearer };
