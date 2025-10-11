import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.get('/', (req, res)=>{
    res.send("Sample server");
})

app.listen(process.env.PORT, ()=>{
    console.log("http://localhost:3000");
})