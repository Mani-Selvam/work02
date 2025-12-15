import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

const callbackURL = process.env.REPLIT_DEV_DOMAIN 
  ? `${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
  : 'http://localhost:5000/api/auth/google/callback';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const displayName = profile.displayName || email?.split('@')[0] || 'User';
          const photoURL = profile.photos?.[0]?.value;
          const googleId = profile.id;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          done(null, {
            email,
            displayName,
            photoURL,
            googleId,
          });
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables not found');
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
