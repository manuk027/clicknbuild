import mongoose from "mongoose";
import dotenv from "dotenv";


dotenv.config();

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Mongodb connected");
    } catch (err) {
        console.log(err.message);
        process.exit(1);
    }
}

