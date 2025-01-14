import fetch, { Headers } from 'node-fetch'; 
globalThis.fetch = fetch;                   
globalThis.Headers = Headers;               

import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import googleTrends from 'google-trends-api';
import { TwitterApi } from 'twitter-api-v2';

dotenv.config();


const client = new TwitterApi({
  appKey: process.env.CONSUMER_KEY,
  appSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const bearer = new TwitterApi(process.env.BEARER_TOKEN);

const twitterClient = client.readWrite;
const twitterBearer = bearer.readOnly;


const googleApiKey = process.env.GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(googleApiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
  },
});

const app = express();
const port = process.env.PORT || 4000;


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

const getTrendingTopicsFromGoogle = async () => {
  try {
    const results = await googleTrends.dailyTrends({
      geo: 'IN', 
      category: 'news', 
    });

    const trendingTopics = JSON.parse(results).default.trendingSearchesDays[0].trendingSearches
      .map(item => item.title.query); 

    console.log('Trending topics from Google Trends:', trendingTopics);
    return trendingTopics;
  } catch (error) {
    console.error('Error fetching trending topics from Google Trends:', error);
    return [];
  }
};

const generateAICryptoTweet = async (trendingTopics) => {
  try {
    const prompt = "Write a brief, engaging tweet about the latest news related to ${trendingTopic}. Include important details and make sure it's framed for an Indian audience. Limit the tweet to 280 characters and use 1-2 relevant hashtags."
    const result = await model.generateContent(prompt);
    const tweetObject = JSON.parse(await result.response.text());
    let tweet = tweetObject?.tweet || "No tweet generated";

    const hashtags = tweet.match(/#\w+/g);
    if (hashtags && hashtags.length > 2) {
      tweet = tweet.replace(/#\w+/g, (match, index) => index < 2 ? match : '');
    }

    return tweet;
  } catch (e) {
    console.log('Error generating AI tweet:', e);
    return null;
  }
};


const tweeting = async () => {
  try {
    const trendingTopics = await getTrendingTopicsFromGoogle();
    if (trendingTopics.length > 0) {
      const randomTopic = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
      console.log(`Selected topic for tweet (10 AM): #${randomTopic}`);
      
      const uniqueTweet = await generateAICryptoTweet(randomTopic);
      console.log(uniqueTweet, 'test');
      
      const tweetResponse = await twitterClient.v2.tweet(uniqueTweet);
      console.log(tweetResponse, 'tweet response');
      console.log('Tweet posted successfully at 10 AM!', tweetResponse);
    } else {
      console.log('No trending topics available.');
    }
  } catch (error) {
    console.error('Error in tweet posting:', error);
  } finally {
    console.log("Exiting the process.");
    process.exit(0); 
  }
};

tweeting();
