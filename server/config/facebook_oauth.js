import passport from "passport"
import FacebookStrategy from "passport-facebook"
import { connectToDb, getDb } from "./db.js";
import dotenv from "dotenv"

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

    passport.use(new FacebookStrategy({
        callbackURL: "/signin/facebook/redirect",
        clientSecret: process.env.FACEBOOK_SECRET,
        clientID : process.env.FACEBOOK_APP_ID
    }, (accessToken, refreshToken, profile, done) => {
        db.collection("collegeStudents").findOne({ facebookID: profile.id }).then(result => {
            if (!result) {
                const newUser = { username: profile.displayName, facebookID: profile.id, email: null }
                db.collection("collegeStudents").insertOne(newUser).then(result => {
                    done(null,newUser)
                })
            }
            else {
                done(null,result)
            }
        })
    }))
}
export default init;