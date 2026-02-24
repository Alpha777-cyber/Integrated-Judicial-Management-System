import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User.js';

/**
 * Passport configuration for authentication strategies
 * This file sets up Google OAuth and JWT strategies
 */

// JWT Strategy for API authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'fallback_secret_key_for_development'
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // Handle both old and new payload structures
      const userId = payload.id || payload.userId || payload.sub;

      if (!userId) {
        return done(null, false);
      }

      const user = await User.findById(userId);

      if (!user) {
        return done(null, false);
      }

      // Check if user is active and not suspended
      if (!user.isActive || user.isSuspended) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            $or: [
              { googleId: profile.id },
              { email: profile.emails[0].value }
            ]
          });

          if (user) {
            // If user exists but doesn't have Google ID, update it
            if (!user.googleId) {
              user.googleId = profile.id;
              user.isEmailVerified = true;
              await user.save();
            }

            // Check if user is active
            if (!user.isActive || user.isSuspended) {
              return done(null, false, { message: 'Account is suspended or inactive' });
            }

            return done(null, user);
          }

          // Create new user
          const newUser = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            profilePhoto: profile.photos[0]?.value,
            isEmailVerified: true,
            role: 'citizen', // Default role for Google signups
            lastLogin: new Date()
          });

          await newUser.save();
          return done(null, newUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

// Serialize and deserialize users (required for passport sessions)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
