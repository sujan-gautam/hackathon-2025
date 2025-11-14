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
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          // 'https://www.googleapis.com/auth/gmail.compose',
          // 'https://mail.google.com/', // Full access (use carefully)
        ],
        accessType: 'offline',     // Ensures refresh token is returned
        prompt: 'consent',         // Forces consent screen → gives refresh token every time
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const googleId = profile.id;

          let user = await User.findOne({ googleId });

          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = googleId;
            } else {
              let username = profile.displayName.replace(/\s+/g, '').toLowerCase();
              const usernameExists = await User.findOne({ username });
              if (usernameExists) {
                username += '_' + Math.random().toString(36).substring(2, 8);
              }

              user = new User({
                googleId,
                email,
                username,
                firstname: profile.name.givenName || '',
                lastname: profile.name.familyName || '',
                avatar: profile.photos?.[0]?.value || null,
              });
            }
          }

          // STORE GMAIL TOKENS
          if (accessToken) {
            user.accessToken = accessToken;
            user.refreshToken = refreshToken || user.refreshToken; // Keep existing if not returned
            user.tokenExpiresAt = new Date(Date.now() + 3599 * 1000); // ~1 hour
            user.tokenScope = profile._json.scope ? profile._json.scope.split(' ') : [];
          }

          await user.save();
          return done(null, user);
        } catch (err) {
          console.error('Google OAuth Error:', err);
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