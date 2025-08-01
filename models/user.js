const { string, required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('dotenv').config();

main()
.then(()=>{
    console.log('Connected to mongoDB✅');
}).catch((err)=>{
    console.log(err);
});

async function main() {
    await mongoose.connect(`${process.env.MONGO_URL}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const User = new mongoose.model("User", userSchema);
module.exports = User;