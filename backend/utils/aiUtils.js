const axios = require('axios');

const extractJSON = (response) => {
  if (!response || typeof response !== 'string') {
    return null;
  }

  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json\s*/g, '').replace(/```$/g, '');
  cleaned = cleaned.replace(/^```\s*/g, '').replace(/```$/g, '');

  try {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    return JSON.parse(cleaned);
  } catch (e) {
    try {
      const lines = cleaned.split('\n');
      let jsonLines = [];
      let inJson = false;
      let braceCount = 0;
      
      for (const line of lines) {
        if (line.includes('{') && !inJson) {
          inJson = true;
        }
        if (inJson) {
          jsonLines.push(line);
          braceCount += (line.match(/\{/g) || []).length;
          braceCount -= (line.match(/\}/g) || []).length;
          if (braceCount === 0 && jsonLines.length > 0) {
            break;
          }
        }
      }
      
      if (jsonLines.length > 0) {
        const joined = jsonLines.join('\n').replace(/}[\s\S]*$/, '}');
        return JSON.parse(joined);
      }
    } catch (e2) {
      return null;
    }
  }
  return null;
};

const generateWithAI = async (prompt, systemPrompt = 'You are a helpful AI assistant.', returnJSON = false) => {
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
            'HTTP-Referer': 'https://ai-career-backend-k3ql.onrender.com',
            'X-Title': 'AI Career System'
          },
          timeout: 60000 // 60 seconds timeout
        }
      );
      
      console.log(`Model ${model} succeeded`);
      
      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Empty response from AI');
      }
      
      const content = response.data.choices[0].message.content;

      if (returnJSON) {
        const parsed = extractJSON(content);
        if (!parsed) {
          console.log(`Model ${model} returned non-JSON response, trying next model...`);
          lastError = new Error('Invalid JSON from model');
          continue;
        }
        return parsed;
      }

      return content;
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

module.exports = { generateWithAI, extractJSON };