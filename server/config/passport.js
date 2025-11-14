const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

module.exports = function configurePassport() {
  passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        // 1️⃣ Find by googleId
        let user = await User.findOne({ googleId });

        // 2️⃣ Link if exists by email
        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = googleId;
          } else {
            // 3️⃣ Create new google user
            let username = profile.displayName.replace(/\s+/g, '').toLowerCase();

            if (await User.findOne({ username })) {
              username += '_' + Math.random().toString(36).substring(2, 6);
            }

            user = new User({
              googleId,
              email,
              username,
              firstname: profile.name.givenName,
              lastname: profile.name.familyName,
              avatar: profile.photos[0].value,
            });
          }

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);


  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      console.error('Deserialize error:', error);
      done(error, null);
    }
  });
};
