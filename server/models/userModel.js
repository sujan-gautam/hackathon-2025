const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [false, "Please enter your username"],
    unique: true,
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
  },
  firstname: {
    type: String,
    required: [true, "Please enter your firstname"],
  },
  lastname: {
    type: String,
    required: [false, "Please enter your lastname"],
  },
  password: {
    type: String,
    required: [false, "Please enter a valid password"],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  location: {
    type: String,
    default: null,
  },

  // GeoJSON field
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },

  website: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },

  // new email Automation onboarding fields
  senderName: {
    type: String,
    default: "",
  },
  senderEmail: {
    type: String,
    default: "",
  },
  brandName: {
    type: String,
    default: "",
  },
  brandDescription: {
    type: String,
    default: "",
  },

  automationGoals: {
    type: [String],
    default: [],
  },

  emailTone: {
    type: String,
    default: "",
  },

  emailFrequency: {
    type: String,
    default: "",
  },
  // ============================

  followers: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],

  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },

}, {
  timestamps: true,
});

userSchema.index({ geoLocation: '2dsphere' });

// Pre-save hook
userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password') && this.password && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (
      this.geoLocation &&
      (!Array.isArray(this.geoLocation.coordinates) ||
        this.geoLocation.coordinates.length !== 2)
    ) {
      this.geoLocation = undefined;
    }

    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
