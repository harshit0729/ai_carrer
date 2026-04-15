const axios = require('axios');

const generateWithAI = async (prompt, systemPrompt = 'You are a helpful AI assistant.') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // Try multiple models
  const models = [
    'google/gemini-2.0-flash-001',
    'google/gemini-flash-1.5-8b',
    'meta-llama/llama-3.1-8b-instruct'
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'AI Career System'
          },
          timeout: 60000 // 60 seconds timeout
        }
      );
      
      console.log(`Model ${model} succeeded`);
      
      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Empty response from AI');
      }
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.log(`Model ${model} failed:`, error.message);
      lastError = error;
      
      // If it's a timeout or rate limit, try next model
      if (error.code === 'ECONNABORTED' || error.response?.status === 429) {
        continue;
      }
      
      // If it's an auth error, don't try other models
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Invalid API key. Please check your OPENROUTER_API_KEY in .env file.');
      }
    }
  }

  // All models failed
  console.error('All AI models failed. Last error:', lastError?.message);
  throw new Error(lastError?.message || 'All AI models failed. Please try again later.');
};

module.exports = { generateWithAI };