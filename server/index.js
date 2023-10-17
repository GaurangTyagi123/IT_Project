import express from "express";
import SignIn from "./Routes/signin.js";
import cors from "cors";
import init from "./config/oauth.js"


const app = express();
init()
app.use(express.json());
app.use(cors())
app.use('/signin', SignIn)


app.post("/", (req, res) => {
    res.redirect("/signin")
})
app.listen(5000);