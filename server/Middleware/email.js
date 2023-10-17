import nodemailer from "nodemailer";
import { connectToDb, getDb } from "../config/db.js";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "gaurangtyagi7@gmail.com",
        pass: "uolqguraakoufngr"
    }
})

const mail = async (email) => {
    let messageId = false;
    let OTP = 10000 + Math.floor(Math.random() * 1000);
    const info = await transporter.sendMail({
        from: 'gaurangtyagi7@gmail.com', // sender address
        to: email, // list of receivers
        subject: "OTP for verification", // Subject line
        text: "Thank You for choosing {Your Company Name}", // plain text body
        html: `<b>{Your Company Name}</b>
            <emp><p>${OTP}</p></emp>
        `, // html body
    }).catch(err => { throw err });
    messageId = info.messageId;
    return OTP;
}
const checkExistence = (mail) => {

}
const validateMail = async (req, res, next) => {
    const { email } = req.body;
    const mailRegex = new RegExp("[A-Za-z0-9\.]+@rla.du.ac.in$");
    let db;
    let flag = false;
    connectToDb((error) => {
        if (!error) {
            db = getDb()
            let emails = [];
            db.collection("collegeStudents").find({ "email": email }).forEach(result => {
                emails.push(result.email)
            }).then(() => {
                flag = emails.length > 0 ? false : true;
                if (!flag)
                    res.status(200).json({ status: false, cause: "user already exists" })
            })
        }
    })
    let otp;
    if (mailRegex.test(email)) {
        otp = await mail(email);
        if (otp>0)
            return res.status(200).json({ otp });
        else
            return res.status(200).json({ status: false, cause: "server error" })
    }
    else
        return res.status(200).json({ status: false, cause: "incorrect email" })
}
// checkExistence('gaurang4065@rla.du.ac.in')
export default validateMail;