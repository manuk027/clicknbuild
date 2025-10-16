import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            let user = await User.findOne({ email });
            if (user) {
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            } else {
                const fullName = profile.displayName;
                user = new User({ fullName, email, googleId: profile.id, });
                await user.save();
                return done(null, user);
            }
        } catch (error) {
            console.error("Google Auth Error:", error);
            return done(error, null);
        }
    }
))

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


export default passport;