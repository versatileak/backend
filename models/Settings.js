const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  razorpay_key_id: {
    type: String,
    default: ''
  },
  razorpay_key_secret: {
    type: String,
    default: ''
  },
  razorpay_webhook_secret: {
    type: String,
    default: ''
  },

  openai_api_key: {
    type: String,
    default: ''
  },
  openai_model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },

  pricing: {
    monthly: {
      amount: {
        type: Number,
        default: 999
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

    quarterly: {
      amount: {
        type: Number,
        default: 2499
      },
      currency: {
        type: String,
        default: 'INR'
      },
      description: {
        type: String,
        default: 'Quarterly Premium Access'
      },
      discount_percentage: {
        type: Number,
        default: 10
      }
    },

    yearly: {
      amount: {
        type: Number,
        default: 2999
      },
      currency: {
        type: String,
        default: 'INR'
      },
      description: {
        type: String,
        default: 'Yearly Premium Access'
      },
      discount_percentage: {
        type: Number,
        default: 17
      }
    }
  },

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
    ref: 'User',
    default: null
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

settingsSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);