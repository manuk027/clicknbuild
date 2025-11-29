//importing necessary modules and functions
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';
import dotenv from 'dotenv';



dotenv.config();



//google authentication
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 
    // 'http://localhost:3000/auth/google/callback',
    'https://v8xmv351-3000.inc1.devtunnels.ms/auth/google/callback',
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            let user = await User.findOne({ email });
            if (user) {
                if (user.isBlocked) {
                    return done(null, false, { message: "User is blocked by the admin" });
                }
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
));



//stores session in passportjs
passport.serializeUser((user, done) => {
    done(null, user.id);
});



//retrieves the data from the session in passportjs
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});



//exporting passport object
export default passport;