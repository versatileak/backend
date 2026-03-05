const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Razorpay Configuration
  razorpay_key_id: {
    type: String,
    required: [true, 'Razorpay Key ID is required'],
    default: ''
  },
  razorpay_key_secret: {
    type: String,
    required: [true, 'Razorpay Key Secret is required'],
    default: ''
  },
  razorpay_webhook_secret: {
    type: String,
    default: ''
  },
  
  // OpenAI Configuration
  openai_api_key: {
    type: String,
    required: [true, 'OpenAI API Key is required'],
    default: ''
  },
  openai_model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  
  // Pricing Configuration
  pricing: {
    monthly: {
      amount: {
        type: Number,
        default: 999 // INR
      },
      currency: {
        type: String,
        default: 'INR'
      },
      description: {
        type: String,
        default: 'Monthly Premium Access'
      }
    },
    yearly: {
      amount: {
        type: Number,
        default: 9990 // INR
      },
      currency: {
        type: String,
        default: 'INR'
      },
      description: {
        type: String,
        default: 'Yearly Premium Access (2 months free)'
      },
      discount_percentage: {
        type: Number,
        default: 17
      }
    }
  },
  
  // App Configuration
  app_name: {
    type: String,
    default: 'Ytlcnich.online'
  },
  app_description: {
    type: String,
    default: 'YouTube Automation US Niches Intelligence Platform'
  },
  support_email: {
    type: String,
    default: 'support@ytlcnich.online'
  },
  
  // Feature Flags
  features: {
    ai_script_generator: {
      type: Boolean,
      default: true
    },
    payment_gateway: {
      type: Boolean,
      default: true
    },
    free_niches_limit: {
      type: Number,
      default: 2
    }
  },
  
  // Maintenance Mode
  maintenance_mode: {
    type: Boolean,
    default: false
  },
  maintenance_message: {
    type: String,
    default: 'We are currently under maintenance. Please check back later.'
  },
  
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Update timestamp
settingsSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
