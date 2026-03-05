const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Niche = require('../models/Niche');
const Settings = require('../models/Settings');

// Sample Niches Data
const nichesData = [
  {
    niche_name: 'Faceless Motivation Channel',
    channel_name: 'Motivation Vault',
    description: 'Create inspiring motivation videos without showing your face using stock footage and voiceovers.',
    earning: {
      min_earning: 3000,
      max_earning: 15000,
      currency: 'USD',
      period: 'monthly'
    },
    competition: {
      level: 'medium',
      score: 6,
      description: 'Moderate competition with room for unique angles and fresh perspectives'
    },
    how_to_work: `
# How to Create a Faceless Motivation Channel

## Step 1: Content Research
- Find trending motivational topics on Reddit, Quora, and Twitter
- Study successful channels like "MotivationHub" and "Be Inspired"
- Create a content calendar with 30 video ideas

## Step 2: Script Writing
- Write 8-12 minute scripts with powerful hooks
- Use storytelling techniques
- Include 3-5 key lessons per video

## Step 3: Voiceover
- Use AI voice tools like ElevenLabs or hire voice artists on Fiverr
- Ensure clear, emotional delivery
- Match tone to content (energetic, calm, etc.)

## Step 4: Video Production
- Source high-quality stock footage from Pexels, Pixabay
- Use B-roll that matches the narrative
- Add subtle background music

## Step 5: Editing & Upload
- Use CapCut or Premiere Pro
- Add captions for retention
- Create eye-catching thumbnails

## Monetization Timeline
- Month 1-3: Build content library (50+ videos)
- Month 4-6: Apply for YouTube Partner Program
- Month 6+: $3,000-$15,000/month potential
    `,
    tools_required: [
      { name: 'ElevenLabs', description: 'AI voice generation', link: 'https://elevenlabs.io', is_free: false },
      { name: 'Pexels', description: 'Free stock footage', link: 'https://pexels.com', is_free: true },
      { name: 'CapCut', description: 'Video editing', link: 'https://capcut.com', is_free: true },
      { name: 'Canva', description: 'Thumbnail design', link: 'https://canva.com', is_free: true },
      { name: 'VidIQ', description: 'SEO and analytics', link: 'https://vidiq.com', is_free: false }
    ],
    is_free: true,
    category: 'entertainment',
    tags: ['motivation', 'faceless', 'voiceover', 'inspiration']
  },
  {
    niche_name: 'AI News & Updates',
    channel_name: 'AI Daily Digest',
    description: 'Cover latest AI developments, tools, and news with screen recordings and commentary.',
    earning: {
      min_earning: 5000,
      max_earning: 25000,
      currency: 'USD',
      period: 'monthly'
    },
    competition: {
      level: 'high',
      score: 8,
      description: 'High competition but massive audience demand for timely AI news'
    },
    how_to_work: `
# How to Create an AI News Channel

## Step 1: Stay Updated
- Follow AI news sources: TechCrunch, The Verge, AI Twitter
- Subscribe to AI company newsletters
- Join AI communities on Discord and Reddit

## Step 2: Content Strategy
- Daily/weekly news roundup format
- Tool tutorials and demonstrations
- Opinion pieces on AI trends

## Step 3: Video Format
- Screen recordings of AI tools in action
- News commentary with B-roll
- Interview clips from AI experts

## Step 4: Production Workflow
- Morning: Research and script
- Afternoon: Record and edit
- Evening: Upload and optimize

## Step 5: Build Authority
- Be first to cover breaking news
- Provide unique insights
- Engage with AI community

## Revenue Streams
- AdSense: $5,000-$15,000/month
- Sponsorships: $2,000-$10,000/video
- Affiliate marketing: $500-$5,000/month
    `,
    tools_required: [
      { name: 'OBS Studio', description: 'Screen recording', link: 'https://obsproject.com', is_free: true },
      { name: 'ChatGPT', description: 'Script assistance', link: 'https://chat.openai.com', is_free: true },
      { name: 'Descript', description: 'Video editing', link: 'https://descript.com', is_free: false },
      { name: 'Notion', description: 'Content planning', link: 'https://notion.so', is_free: true },
      { name: 'Feedly', description: 'News aggregation', link: 'https://feedly.com', is_free: true }
    ],
    is_free: true,
    category: 'tech',
    tags: ['ai', 'news', 'technology', 'screen recording']
  },
  {
    niche_name: 'Wealth & Finance Explained',
    channel_name: 'Money Mastery',
    description: 'Explain financial concepts, investing strategies, and wealth building with animations.',
    earning: {
      min_earning: 8000,
      max_earning: 50000,
      currency: 'USD',
      period: 'monthly'
    },
    competition: {
      level: 'high',
      score: 9,
      description: 'Very high competition but highest CPM rates on YouTube'
    },
    how_to_work: `
# How to Create a Finance Education Channel

## Step 1: Choose Your Angle
- Personal finance for beginners
- Advanced investing strategies
- Financial independence/retire early (FIRE)
- Stock market analysis

## Step 2: Content Research
- Read financial books and blogs
- Follow market news
- Study successful finance YouTubers
- Use credible sources only

## Step 3: Script Structure
- Hook with a relatable problem
- Explain concept simply
- Provide actionable steps
- Include disclaimers

## Step 4: Visual Production
- Use animation tools (Vyond, Animaker)
- Include charts and graphs
- Screen recordings of trading platforms
- Professional voiceover

## Step 5: Compliance & Trust
- Always include disclaimers
- Be transparent about credentials
- Don't give personalized financial advice
- Build credibility over time

## Monetization
- AdSense CPM: $10-$50 (highest niche)
- Course sales: $10,000-$100,000/month
- Affiliate marketing: $5,000-$20,000/month
- Sponsorships: $5,000-$25,000/video
    `,
    tools_required: [
      { name: 'Vyond', description: 'Animation creation', link: 'https://vyond.com', is_free: false },
      { name: 'TradingView', description: 'Chart analysis', link: 'https://tradingview.com', is_free: true },
      { name: 'Audacity', description: 'Audio editing', link: 'https://audacityteam.org', is_free: true },
      { name: 'Google Sheets', description: 'Data visualization', link: 'https://sheets.google.com', is_free: true },
      { name: 'TubeBuddy', description: 'YouTube SEO', link: 'https://tubebuddy.com', is_free: false }
    ],
    is_free: false,
    category: 'business',
    tags: ['finance', 'investing', 'wealth', 'education']
  },
  {
    niche_name: 'Gaming Walkthroughs',
    channel_name: 'Game Guide Pro',
    description: 'Create detailed game walkthroughs, tips, and tutorials for popular games.',
    earning: {
      min_earning: 4000,
      max_earning: 20000,
      currency: 'USD',
      period: 'monthly'
    },
    competition: {
      level: 'high',
      score: 7,
      description: 'High competition but consistent demand for new game content'
    },
    how_to_work: `
# How to Create a Gaming Walkthrough Channel

## Step 1: Game Selection
- Focus on trending/new releases
- Consider evergreen games (Minecraft, GTA)
- Niche down to specific genres
- Play games you enjoy

## Step 2: Content Types
- Full walkthroughs
- Boss fight guides
- Secret/easter egg videos
- Tips and tricks
- Game reviews

## Step 3: Recording Setup
- Capture card for console games
- OBS for PC games
- High-quality microphone
- Face cam (optional)

## Step 4: Editing Style
- Remove boring parts
- Add funny commentary
- Include timestamps
- Use zoom effects for important moments

## Step 5: SEO Strategy
- Target game name + "walkthrough"
- Use chapter markers
- Create series playlists
- Optimize thumbnails with game characters

## Revenue Streams
- AdSense: $2,000-$10,000/month
- Sponsorships: $1,000-$5,000/video
- Affiliate (game sales): $500-$3,000/month
- Channel memberships: $500-$5,000/month
    `,
    tools_required: [
      { name: 'OBS Studio', description: 'Game recording', link: 'https://obsproject.com', is_free: true },
      { name: 'Elgato Capture Card', description: 'Console recording', link: 'https://elgato.com', is_free: false },
      { name: 'Adobe Premiere', description: 'Video editing', link: 'https://adobe.com', is_free: false },
      { name: 'Discord', description: 'Community building', link: 'https://discord.com', is_free: true },
      { name: 'Streamlabs', description: 'Streaming tools', link: 'https://streamlabs.com', is_free: true }
    ],
    is_free: false,
    category: 'gaming',
    tags: ['gaming', 'walkthrough', 'tutorial', 'entertainment']
  },
  {
    niche_name: 'Health & Fitness Tips',
    channel_name: 'FitLife Guide',
    description: 'Share workout routines, nutrition advice, and fitness motivation.',
    earning: {
      min_earning: 6000,
      max_earning: 30000,
      currency: 'USD',
      period: 'monthly'
    },
    competition: {
      level: 'medium',
      score: 7,
      description: 'Medium competition with strong community engagement'
    },
    how_to_work: `
# How to Create a Fitness YouTube Channel

## Step 1: Find Your Niche
- Home workouts (no equipment)
- Gym routines for specific goals
- Nutrition and meal prep
- Specific fitness styles (yoga, HIIT, calisthenics)

## Step 2: Content Planning
- Workout follow-alongs
- Exercise tutorials with proper form
- Nutrition advice and recipes
- Transformation stories
- Fitness myth-busting

## Step 3: Production Quality
- Good lighting (natural or ring light)
- Clear audio instructions
- Multiple camera angles
- On-screen timers and instructions

## Step 4: Build Credibility
- Share your fitness journey
- Get certified (CPT, nutritionist)
- Collaborate with fitness professionals
- Show real results

## Step 5: Community Engagement
- Respond to comments
- Create workout challenges
- Build email list
- Offer free workout plans

## Monetization
- AdSense: $3,000-$15,000/month
- Online coaching: $5,000-$30,000/month
- Digital products: $2,000-$10,000/month
- Supplements affiliate: $1,000-$5,000/month
    `,
    tools_required: [
      { name: 'Ring Light', description: 'Lighting equipment', link: '', is_free: false },
      { name: 'Tripod', description: 'Camera stability', link: '', is_free: false },
      { name: 'Final Cut Pro', description: 'Video editing', link: 'https://apple.com', is_free: false },
      { name: 'MyFitnessPal', description: 'Nutrition tracking', link: 'https://myfitnesspal.com', is_free: true },
      { name: 'Canva', description: 'Thumbnail design', link: 'https://canva.com', is_free: true }
    ],
    is_free: false,
    category: 'health',
    tags: ['fitness', 'health', 'workout', 'nutrition']
  }
];

// Seed Function
const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ytlcnich', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Niche.deleteMany({});
    await Settings.deleteMany({});

    console.log('Cleared existing data');

    // Create Admin User
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
    const admin = await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@ytlcnich.online',
      password: adminPassword,
      role: 'admin',
      subscription_status: 'premium',
      plan_type: 'yearly',
      expiry_date: new Date('2030-12-31')
    });

    console.log('Admin user created:', admin.email);

    // Create Settings
    const settings = await Settings.create({
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || '',
      razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET || '',
      razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      openai_api_key: process.env.OPENAI_API_KEY || '',
      pricing: {
        monthly: {
          amount: 999,
          currency: 'INR',
          description: 'Monthly Premium Access'
        },
        yearly: {
          amount: 9990,
          currency: 'INR',
          description: 'Yearly Premium Access (2 months free)',
          discount_percentage: 17
        }
      }
    });

    console.log('Settings created');

    // Create Niches
    const niches = await Niche.insertMany(
      nichesData.map(niche => ({
        ...niche,
        created_by: admin._id
      }))
    );

    console.log(`${niches.length} niches created`);
    console.log('Free niches:', niches.filter(n => n.is_free).length);
    console.log('Paid niches:', niches.filter(n => !n.is_free).length);

    console.log('\n✅ Database seeded successfully!');
    console.log('\nAdmin Login:');
    console.log('Email:', admin.email);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
