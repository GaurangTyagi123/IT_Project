import passport from "passport"
import GoogleStrategy from "passport-google-oauth2"
import { connectToDb, getDb } from "./db.js";
import dotenv from "dotenv"

dotenv.config()
let db;
connectToDb((err) => {
    if (!err)
        db = getDb()
    else
        throw err;
})

const init = () => {
    passport.serializeUser((user, done) => {
        done(null,user._id)
    })
    passport.deserializeUser((id, done) => {
        db.collection("collegeStudents").findOne({ _id: id }).then(result => {
            done(null,result)
        })
    })

    passport.use(new GoogleStrategy({
        callbackURL : "/signin/google/redirect",
        clientID: process.env.CLIENT_ID,
        clientSecret : process.env.CLIENT_SECRET
    }, (accessToken, refreshToken, profile, done) => {
        db.collection("collegeStudents").findOne({ googleID: profile.id }).then(result => {
            if (!result) {
                const newUser = {googleID:profile.id,username:profile.displayName,email:profile.email,picture:profile.picture}
                db.collection("collegeStudents").insertOne(newUser).then(result => {
                    done(null, newUser)
                })
            }
            else {
                done(null,result)
            }
        })
    }))
}

export default init;