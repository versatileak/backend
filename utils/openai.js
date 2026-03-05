const OpenAI = require('openai');
const Settings = require('../models/Settings');

// Initialize OpenAI
let openaiInstance = null;

const initializeOpenAI = async () => {
  try {
    const settings = await Settings.getSettings();
    
    if (!settings.openai_api_key) {
      throw new Error('OpenAI API key not configured');
    }

    openaiInstance = new OpenAI({
      apiKey: settings.openai_api_key
    });

    return openaiInstance;
  } catch (error) {
    console.error('OpenAI initialization error:', error.message);
    throw error;
  }
};

// Get OpenAI instance
exports.getOpenAI = async () => {
  if (!openaiInstance) {
    await initializeOpenAI();
  }
  return openaiInstance;
};

// Generate YouTube Script
exports.generateScript = async (niche, topic, duration = 'medium') => {
  try {
    const openai = await exports.getOpenAI();
    const settings = await Settings.getSettings();
    
    const durationWords = {
      short: '300-500 words (3-5 minutes)',
      medium: '800-1200 words (8-12 minutes)',
      long: '1500-2000 words (15-20 minutes)'
    };

    const prompt = `Create a complete YouTube video script for the "${niche}" niche${topic ? ` about "${topic}"` : ''}.

Requirements:
- Duration: ${durationWords[duration]}
- Target Audience: US-based viewers
- Style: Engaging, conversational, high retention

Please provide:
1. ATTENTION-GRABBING HOOK (First 30 seconds)
2. INTRO (Channel intro + what viewers will learn)
3. MAIN CONTENT (Broken into clear sections with timestamps)
4. CALL TO ACTION (Subscribe, like, comment prompts)
5. OUTRO

Format the script with clear sections and include [B-ROLL suggestions] where visuals would enhance the content.`;

    const response = await openai.chat.completions.create({
      model: settings.openai_model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert YouTube scriptwriter who creates engaging, high-retention scripts for US audiences. You understand YouTube algorithms and viewer psychology.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generate script error:', error);
    throw error;
  }
};

// Generate Title
exports.generateTitle = async (niche, topic) => {
  try {
    const openai = await exports.getOpenAI();
    const settings = await Settings.getSettings();

    const prompt = `Generate 5 catchy, click-worthy YouTube titles for a video in the "${niche}" niche${topic ? ` about "${topic}"` : ''}.

Requirements:
- Target US audience
- Use power words and emotional triggers
- Include numbers where appropriate
- Keep under 60 characters
- Optimize for CTR (Click-Through Rate)

Format: Numbered list with brief explanation of why each title works.`;

    const response = await openai.chat.completions.create({
      model: settings.openai_model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a YouTube title optimization expert who creates high-CTR titles for US audiences.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 800
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generate title error:', error);
    throw error;
  }
};

// Generate Description
exports.generateDescription = async (niche, topic, title) => {
  try {
    const openai = await exports.getOpenAI();
    const settings = await Settings.getSettings();

    const prompt = `Create an optimized YouTube video description for:
Title: "${title}"
Niche: ${niche}
${topic ? `Topic: ${topic}` : ''}

Requirements:
- First 2 lines must be compelling (above the fold)
- Include timestamps for key sections
- Add relevant links placeholder
- Include social media links
- Add disclaimer if needed
- Optimize for SEO with natural keyword placement
- Target US audience

Format with proper spacing and emoji usage.`;

    const response = await openai.chat.completions.create({
      model: settings.openai_model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a YouTube SEO expert who creates optimized descriptions that rank well and drive engagement.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generate description error:', error);
    throw error;
  }
};

// Generate SEO Tags
exports.generateTags = async (niche, topic, title) => {
  try {
    const openai = await exports.getOpenAI();
    const settings = await Settings.getSettings();

    const prompt = `Generate 15 optimized YouTube tags for:
Title: "${title}"
Niche: ${niche}
${topic ? `Topic: ${topic}` : ''}

Requirements:
- Mix of broad and specific tags
- Include long-tail keywords
- Target US audience
- Order by importance (most important first)
- All lowercase, comma-separated
- Stay within YouTube's 500 character limit

Format: Comma-separated list + brief explanation of tag strategy.`;

    const response = await openai.chat.completions.create({
      model: settings.openai_model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a YouTube SEO expert specializing in tag optimization for maximum discoverability.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generate tags error:', error);
    throw error;
  }
};

// Generate Complete Content Package
exports.generateCompletePackage = async (niche, topic, duration = 'medium') => {
  try {
    const [script, titles, description, tags] = await Promise.all([
      exports.generateScript(niche, topic, duration),
      exports.generateTitle(niche, topic),
      exports.generateDescription(niche, topic, 'Video'),
      exports.generateTags(niche, topic, 'Video')
    ]);

    return {
      script,
      titles,
      description,
      tags,
      niche,
      topic,
      duration,
      generated_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Generate complete package error:', error);
    throw error;
  }
};
