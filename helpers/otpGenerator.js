import emailOtp from "../models/otp.js ";

export async function generateOtp(email) {
    await emailOtp.deleteMany({ email });
    let otp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOTP = new emailOtp({
        otp: otp,
        email: email,
    })
    await verificationOTP.save()
    return otp;
}