import User from '../models/userSchema.js';
import crypto from 'crypto'

export async function generateUniqueReferralCode() {
    while (true) {
        const code = crypto.randomBytes(8).toString("hex").toUpperCase();
        const exists = await User.findOne({ referralCode: code });

        if (!exists) {
            return code;
        }
    }
}
