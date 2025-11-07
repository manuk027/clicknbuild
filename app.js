//importing necessary modules and functions
import express, { urlencoded } from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import cartRouter from "./routes/User/cartRouter.js"
import wishlistRouter from "./routes/User/wishlistRouter.js";
import session from "express-session";
import nocache from "nocache";
import passport from "./config/passport.js";
import cors from 'cors';




dotenv.config();
connectDB();
const app = express();
app.use(cors());

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);


//managing passport session
app.use(passport.initialize());
app.use(passport.session());

app.use(nocache());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//setting views
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);

//defining routes for admin side and user side
app.use(express.static(path.join(__dirname, "public")));
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/cart", cartRouter)
app.use("/wishlist", wishlistRouter)

app.listen(process.env.PORT, () => {
  console.log(`http://localhost:${process.env.PORT}`);
});
