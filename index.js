import fetch, { Headers } from 'node-fetch'; // Import fetch and Headers from node-fetch
globalThis.fetch = fetch;                    // Make fetch available globally
globalThis.Headers = Headers;                // Make Headers available globally

import dotenv from 'dotenv';
import express from 'express';
import twitterClient from './twitterClient.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import googleTrends from 'google-trends-api';

dotenv.config();

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
      geo: 'US', 
      category: 'all', 
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
    const prompt = `Write an engaging tweet about ${trendingTopics}. Keep it relevant and fun!`;
    const result = await model.generateContent(prompt);
    const tweetObject = JSON.parse(await result.response.text());
    return tweetObject?.tweet || "No tweet generated";
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
      if (uniqueTweet) {
        console.log('Tweeting AI-generated content:', uniqueTweet);
        await twitterClient.v2.tweet(uniqueTweet);
        console.log('Tweet posted successfully at 10 AM!');
      }
    } else {
      console.log('No trending topics available.');
    }
  } catch (error) {
    console.error('Error in tweet posting:', error);
  }
};

tweeting();
