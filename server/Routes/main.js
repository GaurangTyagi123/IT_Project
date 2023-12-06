import { Router, response } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import multer from "multer"
import { connectToDb, getDb } from "../config/db.js"
import { ObjectId } from "mongodb"
import axios from "axios"
import connectToClassroom from "../config/connectToAuth.js"
import passport from "passport"
import session from "express-session"


let Route = Router()
Route.use(session({
    maxSize: 24 * 60 * 60 * 1000,
    secret: process.env.COOKIE_SECRET,
    resave: true,
    saveUninitialized: true
}))
Route.use(passport.initialize())
Route.use(passport.session())

dotenv.config()
let db;
connectToDb((err) => {
    if (!err)
        db = getDb()
    else
        throw err;
})
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        return cb(null, "./profile_pics")
    },
    filename: async (req, file, cb) => {
        let name;
        let id = req.params.id;
        id = jwt.decode(id, process.env.SIGN)
        id = new ObjectId(id)
        const result = await db.collection("collegeStudents").findOne({ _id: id });
        name = result ? result.username : `${Date.now()}-${file.originalname}`;
        if (name)
            return cb(null, `${name}.jpg`)
    }
})
const fileFilter = (req, file, done) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        done(null, true)
    }
    else {
        done(new Error("File is not supported"))
    }
}
const limits = {
    fileSize: 5 * 1024 * 1024
}
const upload = multer({ storage, fileFilter, limits })

Route.post("/additionalInfo", (req, res) => {
    const { token } = req.body;
    if (token && token.length > 0) {
        let result = jwt.decode(token, process.env.SIGN)
        if (result != null) {
            return res.status(200).json({ status: true, cause: "valid user" })
        }
        else
            return res.status(200).json({ status: false, cause: "invalid user" })
    }
    else {
        res.status(200).json({ status: false, cause: "token not set" })
    }
})
Route.get("/checkInfo/:token", (req, res) => {
    const { token } = req.params
    let id = jwt.decode(token, process.env.SIGN)
    id = new ObjectId(id)
    db.collection("collegeStudents").findOne({ _id: id }).then(result => {
        if (result) {
            if (result.Department !== undefined)
                return res.status(200).json({ "flag": true })
            else
                return res.status(200).json({ "flag": false })
        }
        else {
            return res.status(200).json({ flag: false })
        }
    }).catch(err => res.status(501).json(err))
})
Route.post("/info/:id", upload.single("Image"), (req, res) => {
    const token = req.params.id
    const { Department, Society, Semester } = req.body
    let id = jwt.decode(token, process.env.SIGN)
    id = new ObjectId(id)
    let info;
    info = { Department, Society, Semester }
    let Societies = Society.split(",")
    if (req.file) {
        info = { profile_pic: req.file.path, Department, Societies, Semester }
    }
    else
        info = { Department, Societies, Semester }
    db.collection("collegeStudents").updateOne({ _id: id }, { $set: info }).then(result => {
        if (result.acknowledged) {
            return res.status(200).json({ status: true, data: req.body, cause: "data updated" })
        }
    })
})
Route.get("/getinfo/:id", (req, res) => {
    const token = req.params.id
    let id = jwt.decode(token, process.env.SIGN)
    id = new ObjectId(id)

    db.collection("collegeStudents").findOne({ _id: id }).then(async result => {
        if (result) {
            let profilePath;
            const { username, email, profile_pic, Department, Societies, Semester, courseInfo, tokens } = result;
            let outsider = false
            if (result.googleID || result.facebookID)
                outsider = true;
            let socLinks = []
            await db.collection("Society_Details").find({ name: { $in: Societies } }).forEach(result => {
                if (result)
                    socLinks.push(result.displayPicture)
            })
            let departmentDetails = {};
            await db.collection("Department_Details").findOne({ Department: Department }).then(result => {
                if (result) {
                    departmentDetails = result
                }
                else {
                    departmentDetails = {}
                }
            })
            let teacherDetails = new Object();
            let facultyDetails = [];
            let teacherIncharge = departmentDetails["Teacher Incharge"]
            let societyIncharge = departmentDetails["Society Incharge"]
            let regexp;

            await db.collection("Teacher_Details").findOne({ Name: teacherIncharge }).then(result => {
                if (result) {
                    teacherDetails["Teacher Incharge"] = result.Profile
                    teacherDetails.Teacher_Incharge_Email = result.contactDetails.Email
                }
                else {
                    teacherDetails["Teacher Incharge"] = ""
                    teacherDetails.Teacher_Incharge_Email = ""

                }
            })
            regexp = new RegExp(societyIncharge)
            await db.collection("Teacher_Details").findOne({ Name: { $regex: regexp } }).then(result => {
                if (result) {
                    teacherDetails["Society Incharge"] = result.Profile
                    teacherDetails.Society_Incharge_Email = result.contactDetails.Email
                }
                else {
                    teacherDetails["Society Incharge"] = ""
                    teacherDetails.Society_Incharge_Email = ""

                }
            })
            await db.collection("Teacher_Details").find({ Name: { $in: departmentDetails.Faculty } }).forEach(ele => {
                let tempObj = new Object();
                tempObj.Designation = ele.Designation
                tempObj.Profile = ele.Profile
                tempObj.Name = ele.Name
                tempObj.Email = ele.contactDetails.Email
                facultyDetails.push(tempObj)
            })
            let accessToken = null
            if (!outsider) {
                accessToken = tokens ? tokens.accessToken : ''
                profilePath = `http://localhost:5000/${profile_pic}`
            }
            else {
                
                accessToken = tokens ? tokens.accessToken : ''
                profilePath = profile_pic;
            }
            const mask = { username, email, profile_pic: profilePath, departmentDetails, teacherDetails, facultyDetails, Semester, Societies, socLinks, outsider, courseInfo, accessToken: accessToken }
            return res.status(200).json({ status: true, data: mask, cause: "user found" })
        }
    })
})
Route.get("/connectToClassroom/:id", (req, res) => {
    let { id } = req.params;
    id = jwt.decode(id, process.env.SIGN)
    id = new ObjectId(id)
    db.collection("collegeStudents").findOne({ _id: id }).then(async result => {
        if (!result.googleID) {
            connectToClassroom(id)
            res.status(200).json({ googleUser: false, status: true })
        }
    })
})
Route.get("/connect", passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/classroom.coursework.me"] }))
Route.get("/connected", passport.authenticate("google"), (req, res) => {
    const user = req.user;
    if (user) {
        let token = jwt.sign((user._id).toString(), process.env.SIGN)
        res.redirect(`http://localhost:3000/profile?${token}`)
    }
    else {
        res.send("Please try again with your college id")
    }
})
Route.get("/assignments/:id/:token", (req, res) => {
    const { id, token } = req.params
    axios.get(`https://classroom.googleapis.com/v1/courses/${id}/courseWork`, { headers: { Authorization: `Bearer ${token}` }, params: { courseId: id } }).then(async result => {
        let assignments = await result.data.courseWork.map(async ele => {
            let temp = new Object();
            await axios.get(`https://classroom.googleapis.com/v1/courses/${ele.id}/courseWork/${ele.courseId}/studentSubmissions`, { headers: { Authorization: `Bearer ${token}` }, params: { courseId: id, courseWorkId: ele.id } }).then(result => {
                temp.title = ele.title
                temp.description = ele.description
                temp.dueDate = ele.dueDate
                temp.link = ele.alternateLink
                temp.state = result.data.studentSubmissions[0].state
            })
            return temp
        })
        Promise.all(assignments).then(result => {
            return res.json({status:true,result})
        })
    })
})
export default Route