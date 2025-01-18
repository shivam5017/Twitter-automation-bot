import fetch, { Headers } from 'node-fetch';
globalThis.fetch = fetch;
globalThis.Headers = Headers;
import axios from 'axios';
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

// Fetch trending topics from Google
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

// Fetch image using Google Custom Search
const fetchImageFromGoogle = async (topic) => {
  const googleApiKey = process.env.API_KEY; // Your API key from Google Cloud
  const cx = process.env.CX_KEY; // Your Custom Search Engine ID
  
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        q: topic,  
        cx: cx,    
        key: googleApiKey,
        searchType: 'image', 
        num: 1, 
      },
    });

    if (response.data.items && response.data.items.length > 0) {
      const imageUrl = response.data.items[0].link; 
      return imageUrl;
    } else {
      console.log(`No images found for topic: ${topic}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching image from Google:', error);
    return null;
  }
};

// Generate AI crypto tweet
const generateAICryptoTweet = async (trendingTopics) => {
  try {
    const prompt = `Write a brief, engaging tweet about the latest news related to ${trendingTopics}. Include important details and make sure it's framed for an Indian audience. Limit the tweet to 280 characters and use 1-2 relevant hashtags.`;
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

// Function for tweeting (with or without image)
const tweeting = async () => {
  try {
    const trendingTopics = await getTrendingTopicsFromGoogle();
    if (trendingTopics.length > 0) {
      const randomTopic = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
      console.log(`Selected topic for tweet: #${randomTopic}`);

      // Generate the tweet based on the topic
      const uniqueTweet = await generateAICryptoTweet(randomTopic);
      console.log('Generated Tweet:', uniqueTweet);

      // Fetch the image for the generated topic using Google Custom Search
      const imageUrl = await fetchImageFromGoogle(randomTopic);
      console.log('Image URL:', imageUrl);

      if (imageUrl) {
        // Download the image (as buffer)
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(response.data, 'binary');

        // Upload the media using v1.1 API (this is for both image and video)
        const media = await client.v1.uploadMedia(mediaBuffer, {
          mimeType: 'image/jpeg', // Use correct MIME type
        });

        // Post the tweet with the media ID using v1.1 API
        const tweetResponse = await client.v1.tweet({
          status: uniqueTweet,  // The tweet text
          media_ids: media.media_id_string, // Media ID for the uploaded image
        });

        console.log('Tweet posted successfully with image!');
      } else {
        // Post the tweet without the image if no image is found
        const tweetResponse = await client.v1.tweet({
          status: uniqueTweet,  // The tweet text
        });
        console.log('Tweet posted successfully without image!');
      }
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

// Call the tweeting function
tweeting();
