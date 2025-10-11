import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();
connectDB();
const app = express();

app.get('/', (req, res) => {
    res.send("Sample server");
})

app.listen(process.env.PORT, () => {
    console.log("http://localhost:3000");
})
