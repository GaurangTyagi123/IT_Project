import express from "express";
import SignIn from "./Routes/signin.js";
import Main from "./Routes/main.js";
import cors from "cors";
import init from "./config/oauth.js"
import fs from "fs";

const app = express();
init()
app.use(express.json());
app.use(express.urlencoded({extended:false}))
app.use(cors())
app.use('/signin', SignIn)
app.use('/main', Main)


app.get("/profile_pics/:file", (req, res) => {
    let file = fs.readFileSync(`profile_pics/${req.params.file}`)
    res.setHeader('content-type', 'image/jpg')
    res.status(200).send(file)
})

app.listen(5000);