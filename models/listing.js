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

let listingSchema = new mongoose.Schema({
    title: String,
    description: String,
    image: {
        url: String,
        filename: String
    },
    price: Number,
    location: String,
    country: String,
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review"
    }],
    category: {
        type: String,
        enum: ["room", "iconic cities", "mountain", "castles", "pools", "camping", "farm", "arctic", "domes", "boats"]
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

let Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing;