const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Recipe URL is required' }),
      };
    }

    // Check which API key is available (prioritize Gemini since it's free)
    const geminiKey = process.env.GEMINI_API_KEY;
    const claudeKey = process.env.ANTHROPIC_API_KEY;

    if (!geminiKey && !claudeKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'No API key configured. Please add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY to your Netlify environment variables.' 
        }),
      };
    }

    if (geminiKey) {
      // Use Google Gemini API (FREE)
      return await convertWithGemini(url, geminiKey, headers);
    } else {
      // Use Anthropic Claude API (paid)
      return await convertWithClaude(url, claudeKey, headers);
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to convert recipe: ' + error.message }),
    };
  }
};

async function convertWithGemini(url, apiKey, headers) {
  // First fetch the recipe content
  let recipeContent = '';
  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (fetchResponse.ok) {
      recipeContent = await fetchResponse.text();
    } else {
      recipeContent = `URL: ${url}`;
    }
  } catch (e) {
    recipeContent = `URL: ${url}`;
  }

  const prompt = `You are a Thermomix TM6 expert. Convert this recipe to precise TM6 instructions.

RECIPE URL: ${url}
${recipeContent.length > 8000 ? 'RECIPE CONTENT: (truncated for length)' : `RECIPE CONTENT: ${recipeContent.slice(0, 8000)}`}

TM6 SPEED KNOWLEDGE:
- Wooden Spoon: 40 RPM (gentle stirring, no chopping)
- Speed 1: 100 RPM (gentle mixing)  
- Speed 2: 200 RPM (light mixing)
- Speed 3: 500 RPM (soft stirring/light chopping)
- Speed 4: 1100 RPM (coarse chopping)
- Speed 5: 2000 RPM (medium chopping/mixing)
- Speed 6: 3100 RPM (fine chopping)
- Speed 7: 4400 RPM (very fine chopping)
- Speed 8: 5800 RPM (blending)
- Speed 9: 7300 RPM (smooth blending)
- Speed 10: 8800 RPM (pulverizing)
- Turbo: 10,700 RPM (maximum speed, short bursts only)

TM6 TEMPERATURE RANGE: 37°C to 160°C (manual), up to 180°C (guided cooking only)
VAROMA TEMPERATURE: ~120°C for steaming

TM6 KEY RULES:
- Use Speed 1-3 for gentle stirring without chopping
- Use Speed 4-7 for chopping (4=coarse, 7=fine)
- Use Speed 8-10 for blending and smooth textures
- Turbo only for hard ingredients in short bursts (0.5-2 sec)
- No heating above Speed 6 (heating automatically disabled)
- Reverse mode available at any speed for gentle mixing
- MC (Measuring Cup) must be on unless adding ingredients

Return ONLY JSON with this exact structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prepTime": "X min", 
  "totalTime": "X min",
  "servings": 4,
  "ingredients": [
    {"amount": 200, "unit": "g", "item": "ingredient"}
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short action",
      "instruction": "What to do",
      "settings": {
        "speed": "5",
        "temp": "100", 
        "time": "3:00",
        "reverse": false,
        "mc": true
      },
      "note": "Brief tip"
    }
  ],
  "tips": ["tip 1", "tip 2"]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }
  
  const text = data.candidates[0].content.parts[0].text;
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;
  
  try {
    const recipeData = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ content: [{ text: JSON.stringify(recipeData) }] }),
    };
  } catch (parseError) {
    throw new Error('Failed to parse recipe data from Gemini response');
  }
}

async function convertWithClaude(url, apiKey, headers) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      system: `You are a Thermomix TM6 expert. Convert recipes to precise TM6 instructions.

TM6 SPEED KNOWLEDGE:
- Wooden Spoon: 40 RPM (gentle stirring, no chopping)
- Speed 1: 100 RPM (gentle mixing)  
- Speed 2: 200 RPM (light mixing)
- Speed 3: 500 RPM (soft stirring/light chopping)
- Speed 4: 1100 RPM (coarse chopping)
- Speed 5: 2000 RPM (medium chopping/mixing)
- Speed 6: 3100 RPM (fine chopping)
- Speed 7: 4400 RPM (very fine chopping)
- Speed 8: 5800 RPM (blending)
- Speed 9: 7300 RPM (smooth blending)
- Speed 10: 8800 RPM (pulverizing)
- Turbo: 10,700 RPM (maximum speed, short bursts only)

TM6 TEMPERATURE RANGE: 37°C to 160°C (manual), up to 180°C (guided cooking only)
VAROMA TEMPERATURE: ~120°C for steaming

TM6 KEY RULES:
- Use Speed 1-3 for gentle stirring without chopping
- Use Speed 4-7 for chopping (4=coarse, 7=fine)
- Use Speed 8-10 for blending and smooth textures
- Turbo only for hard ingredients in short bursts (0.5-2 sec)
- No heating above Speed 6 (heating automatically disabled)
- Reverse mode available at any speed for gentle mixing
- MC (Measuring Cup) must be on unless adding ingredients

Return ONLY JSON:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prepTime": "X min", 
  "totalTime": "X min",
  "servings": 4,
  "ingredients": [
    {"amount": 200, "unit": "g", "item": "ingredient"}
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Short action",
      "instruction": "What to do",
      "settings": {
        "speed": "5",
        "temp": "100", 
        "time": "3:00",
        "reverse": false,
        "mc": true
      },
      "note": "Brief tip"
    }
  ],
  "tips": ["tip 1", "tip 2"]
}`,
      messages: [{ 
        role: "user", 
        content: `Please fetch the recipe from this URL and convert it to accurate TM6 format: ${url}

Extract the recipe content and convert it to Thermomix TM6 instructions with proper speeds, temperatures, and timings.`
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(data),
  };
}
