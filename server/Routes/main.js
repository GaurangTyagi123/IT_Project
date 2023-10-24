import { Router } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import multer from "multer"
import { connectToDb, getDb } from "../config/db.js"
import { ObjectId } from "mongodb"


let Route = Router()
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
        return cb(null,"./profile_pics")
    },
    filename: (req, file, cb) => {
        return cb(null,`${Date.now()}-${file.originalname}`)
    }
})
const fileFilter = (req, file, done) => {
    if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
        done(null,true)
    }
    else {
        done(new Error("File is not supported"))
    }
}
const limits = {
    fileSize: 5*1024*1024
}
const upload = multer({storage,fileFilter,limits})

Route.post("/additionalInfo",  (req, res) => {
    const { token } = req.body;
    if (token && token.length>0) {
        let result = jwt.decode(token,process.env.SIGN)
        if (result !=null) {
            return res.status(200).json({status:true,cause:"valid user"})
        }
        else
            return res.json({status:false,cause:"invalid user"})
    }
    else {
        res.status(200).json({status:false,cause:"token not set"})
    }
})
Route.get("/checkInfo/:token", (req, res) => {
    const { token } = req.params
    let id = jwt.decode(token,process.env.SIGN)
    id = new ObjectId(id)
    db.collection("collegeStudents").findOne({ _id: id }).then(result => {
        if (result) {
            if(result.Department !== undefined)
                return res.status(200).json({"flag":true})
            else
                return res.status(200).json({"flag" : false})
        }
        else {
            return res.status(200).json({flag:false})
        }
    }).catch(err=>res.status(501).json(err))
})
Route.post("/info/:id", upload.single("Image"), (req, res) => {
    const token = req.params.id
    const { Department, Society, Semester } = req.body
    let id = jwt.decode(token, process.env.SIGN)
    id = new ObjectId(id)
    db.collection("collegeStudents").updateOne({ _id: id },{$set:{profile_pic:req.file.path,Department,Society,Semester}}).then(result => {
        if (result.acknowledged) {
            return res.status(200).json({ status: true, data:req.body,cause:"data updated"})
        }
    })
})

export default Route