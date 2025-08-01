const jwt = require("jsonwebtoken")
require("dotenv").config()

function generateToken(userId) {
    let token = jwt.sign({id: userId}, 
        process.env.JWT_SECRET,
        {expiresIn: process.env.EXPIRES_IN || "30d"}
    );
    return token;
}

module.exports = generateToken;
