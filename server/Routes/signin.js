import express, { Router } from "express";
import checkPass from "../Middleware/validate.js";
import { connectToDb, getDb } from '../config/db.js';
import bcryptjs from "bcryptjs";
import validateMail from "../Middleware/email.js";
import passport from "passport";
import init from "../config/oauth.js"
import facebook_init from "../config/facebook_oauth.js"
import jws from "jsonwebtoken";
import session from "express-session"
import dotenv from "dotenv"


const Route = Router();
dotenv.config()
init()
facebook_init()
Route.use(session({
    maxSize: 24 * 60 * 60 * 1000,
    secret: process.env.COOKIE_SECRET,
    resave: true,
    saveUninitialized:true
}))
Route.use(passport.initialize())
Route.use(passport.session())

let db
connectToDb((err) => {
    if (!err) {
        db = getDb()
    }
    else {
        throw err
    }
})
Route.get("/google", passport.authenticate("google", {
    scope:["profile","email"]
}))
Route.get("/google/redirect", passport.authenticate("google"), (req, res) => {
    if (req.user) {
        const token = jws.sign((req.user._id).toString(), process.env.SIGN);
        res.redirect(`http://localhost:3000/profile?token=${token}`)
    }
    else
        res.status(200).json({status:false,cause:"user not found"})
})
Route.get("/facebook", passport.authenticate("facebook",{scope:["email","user_photos"]}))
Route.get("/facebook/redirect", passport.authenticate("facebook"), (req, res) => {
    if (req.user) {
        const token = jws.sign((req.user._id).toString(), process.env.SIGN);
        res.redirect(`http://localhost:3000/profile?token=${token}`)
    }
    else
        res.status(200).json({status:false,cause:"user not found"})
})
Route.post("/",[checkPass,validateMail], async (req, res) => {
    res.json({status:true})
})
Route.post("/signup", async (req, res) => {
    const { username, email, password,genOtp,inpOtp } = req.body;
    const salt = await bcryptjs.genSalt(10);
    const passhash = await bcryptjs.hash(password, salt);
    const newUser = { username, email, passhash }
    
    if (genOtp == inpOtp) {
        db.collection("collegeStudents").insertOne(newUser).then(result => {
            const token = jws.sign(result.insertedId.toString(),process.env.SIGN)
            res.status(200).json({token})
        }).catch(err => {
            res.status(200).json({ status: false, error: err });
        })
    }
    else {
        return res.status(500).json({status:false})
    }
})
Route.post("/login",  (req, res) => {
    const { username, email, password } = req.body;
    db.collection("collegeStudents").findOne({ email, username }).then(async result => {
        if (result) {
            const passCheck = await bcryptjs.compare(password, result.passhash)
            if (passCheck) {
                const token = jws.sign((result._id).toString(),process.env.SIGN)
                return res.status(200).json({token})
            }
            else {
                return res.status(200).json({status:false,cause:"incorrect password"})
            }
            
        }
        else {
            return res.status(200).json({status:false,cause:"incorrect username or email"})
        }
    })
})
export default Route;