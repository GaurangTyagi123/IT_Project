const checkPass = (req, res, next) => {
    const { password, confPass } = req.body;
    let passRegex = new RegExp("[0-9]+[@$#%&]*[a-zA-Z]*")
    if (password !== confPass || !passRegex.test(password)) {
        return res.status(200).json({ status: false, cause: "incorrect password" })
    }
    else {
        next();
    }
}
export default checkPass;