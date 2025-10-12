import mongoose, { now } from "mongoose";
const { Schema, model } = mongoose;

const addressSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, },
    address: [{
        fullName: { type: String, required: true, },
        phoneNumber: { type: String, required: true, },
        address: { type: String, required: true, },
        district: { type: String, required: true, },
        state: { type: String, required: true, },
        city: { type: String, required: true, },
        pincode: { type: String, required: true, },
        landmark: { type: String, required: false },
        createdAt: { type: Date, default: Date.now, },
        updatedAt: { type: Date, default: Date.now },
    }]
})

const Address = model("Address", addressSchema);
export default Address;