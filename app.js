import express, { urlencoded } from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from './routes/userRouter.js'; 

dotenv.config();
connectDB();
const app = express();

//middlewares
app.use(express.urlencoded({extended:true}));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', userRouter);

app.get('/', (req, res) => {
    res.send("Sample server");
})

app.listen(process.env.PORT, () => {
    console.log("http://localhost:3000");
})
