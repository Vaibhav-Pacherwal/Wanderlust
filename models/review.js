const mongoose = require("mongoose");
const { min } = require("../schema");
const { ref } = require("joi");
const Schema = mongoose.Schema;
require("dotenv").config();

main()
.then(()=>{
    console.log("Connected to mongoDB✅")
}).catch((err)=>{
    console.log(err);
});

async function main() {
    await mongoose.connect(`${process.env.MONGO_URL}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

const reviewSchema = new Schema({
    comment: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

const Review = new mongoose.model("Review", reviewSchema);

module.exports = Review;