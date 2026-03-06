const mongoose = require('mongoose');

const nicheSchema = new mongoose.Schema({
  niche_name: {
    type: String,
    required: [true, 'Please provide niche name'],
    trim: true,
    maxlength: [100, 'Niche name cannot be more than 100 characters']
  },
  channel_name: {
    type: String,
    required: [true, 'Please provide channel name'],
    trim: true,
    maxlength: [100, 'Channel name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters'],
    default: ''
  },

  // ✅ MAIN IMAGE FIELD
  image: {
    type: String,
    default: ''
  },

  // ✅ OLD FIELD KEEP FOR COMPATIBILITY
  thumbnail: {
    type: String,
    default: ''
  },

  earning: {
    min_earning: {
      type: Number,
      default: 0
    },
    max_earning: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'monthly'
    }
  },
  competition: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    score: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    description: {
      type: String,
      maxlength: [300, 'Competition description cannot be more than 300 characters'],
      default: ''
    }
  },
  how_to_work: {
    type: String,
    required: [true, 'Please provide how to work guide'],
    maxlength: [10000, 'Guide cannot be more than 10000 characters']
  },
  tools_required: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Tool description cannot be more than 200 characters']
    },
    link: {
      type: String,
      default: ''
    },
    is_free: {
      type: Boolean,
      default: false
    }
  }],
  is_free: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['entertainment', 'education', 'gaming', 'tech', 'lifestyle', 'business', 'health', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  view_count: {
    type: Number,
    default: 0
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Create slug before saving
nicheSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.niche_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // ✅ image aur thumbnail dono sync rahenge
  if (this.image && !this.thumbnail) {
    this.thumbnail = this.image;
  }

  if (this.thumbnail && !this.image) {
    this.image = this.thumbnail;
  }

  next();
});

// Update timestamp
nicheSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updated_at = Date.now();
  }
  next();
});

// Index for search
nicheSchema.index({ niche_name: 'text', description: 'text', tags: 'text' });

// Static method to get free niches
nicheSchema.statics.getFreeNiches = function() {
  return this.find({ is_free: true, is_active: true }).sort({ created_at: -1 });
};

// Static method to get all active niches
nicheSchema.statics.getAllActiveNiches = function() {
  return this.find({ is_active: true }).sort({ created_at: -1 });
};

module.exports = mongoose.model('Niche', nicheSchema);