import passport from "passport"
import GoogleStrategy from "passport-google-oauth2"
import { connectToDb, getDb } from "./db.js";
import dotenv, { config } from "dotenv"
import axios from "axios"
import { write, writeFile} from "fs"

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
        done(null, user._id)
    })
    passport.deserializeUser((id, done) => {
        db.collection("collegeStudents").findOne({ _id: id }).then(result => {
            done(null, result)
        })
    })

    passport.use(new GoogleStrategy({
        callbackURL: "/signin/google/redirect",
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET
    }, async (accessToken, refreshToken, profile, done) => {
        db.collection("collegeStudents").findOne({ googleID: profile.id }).then(async result => {
            let tokens = { accessToken, refreshToken }
            const courseParams = new URLSearchParams({
                studentId: profile.email,
            })
            let response = await axios.get("https://classroom.googleapis.com/v1/courses", { headers: { Authorization: `Bearer ${accessToken}` }, courseParams })
            let courseInfo = response.data.courses.map(ele => {
                if (ele.courseState === 'ACTIVE') {
                    let temp = new Object()
                    temp.name = ele.name;
                    temp.section = ele.section;
                    temp.room = ele.room;
                    temp.id = ele.id;
                    return temp;
                }
            })
            if (!result) {
                const newUser = { googleID: profile.id, username: profile.displayName, email: profile.email, profile_pic: profile.picture, courseInfo,tokens }
                db.collection("collegeStudents").insertOne(newUser).then(result => {
                    done(null, newUser)
                })
            }
            else {
                await db.collection("collegeStudents").updateOne({_id:result._id},{$set:{tokens:tokens,courseInfo}})
                done(null,result)
            }
        })
    }))
}

export default init;