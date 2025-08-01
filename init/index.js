const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require('../models/listing.js');
require('dotenv').config({path: require('path').resolve(__dirname, '../.env')});

main()
.then(()=>{
    console.log('Connected to mongoDB✅');
}).catch((err)=>{
    console.log(err);
})

async function main() {
    await mongoose.connect(`${process.env.MONGO_URL}`);
}

async function initDB() {
    await Listing.deleteMany({});
    initData.data = initData.data.map(obj => ({...obj, owner: "6887c5376776902e476ef337"}));
    await Listing.insertMany(initData.data);
    console.log('initial data inserted successfully✅');
}

initDB();