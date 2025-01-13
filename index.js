
const fetch = require('node-fetch'); 

require("dotenv").config({ path: __dirname + "/.env" });
const express = require('express');
const { twitterClient } = require("./twitterClient.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const CronJob = require("cron").CronJob;
const googleTrends = require('google-trends-api');
const googleApiKey = process.env.GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(googleApiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

const app = express();
const port = process.env.PORT || 4000;

let tweetedMessages = new Set();

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

const generateUniqueTweet = async (topic) => {
  let tweet = await generateAICryptoTweet(topic);
  
  // Keep regenerating the tweet until it's unique
  while (tweetedMessages.has(tweet)) {
    tweet = await generateAICryptoTweet(topic);
  }

  tweetedMessages.add(tweet);
  return tweet;
};

const tweeting = async() => {
  try {
      const trendingTopics = await getTrendingTopicsFromGoogle();
      if (trendingTopics.length > 0) {
        const randomTopic = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
        console.log(`Selected topic for tweet (10 AM): #${randomTopic}`);
        
        const uniqueTweet = await generateUniqueTweet(randomTopic);
        if (uniqueTweet) {
          console.log('Tweeting AI-generated content:', uniqueTweet);
          await twitterClient.v2.tweet(uniqueTweet);
          console.log('Tweet posted successfully at 10 AM!');
        }
      } else {
        console.log('No trending topics available.');
      }
    } catch (error) {
      console.error('Error in 5 AM tweet posting:', error);
    }
}

tweeting();
