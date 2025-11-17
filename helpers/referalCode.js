import User from '../models/userSchema.js';

export const generateUniqueReferralCode = async (userId) => {
  console.log(userId);
  const user = await User.findById(userId);
  console.log(user);
  let name = user.fullName.split(' ').join('').toUpperCase().split('').splice(0, 5).join('');
  const random = generateReferralCode();
  return name.concat(random);
}


import crypto from "crypto";

const generateReferralCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};
