const jwt = require("jsonwebtoken");
const expressError = require("./expressError");
const User = require("../models/user")
require("dotenv").config();

const protected = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        req.session.returnTo = req.originalUrl;

        if(!token) {
            throw new expressError(401, "No Authorization, No token");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if(!user) {
            throw new expressError(404, "User Not Found!");
        }

        req.user = user;

        next();
    } catch(err) {
        req.flash("error", "you must be logged in!");
        res.redirect("/login");
    }
}

module.exports = protected;