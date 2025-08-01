const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { storage } = require("./cloudConfig.js");
const multer  = require("multer");
const upload = multer({ storage });
const getCoordinates = require("./utils/getCoordinates.js");
const app = express();
const server = require('http').createServer(app);
const Listing = require('./models/listing.js');
const User = require("./models/user.js");
const generateToken = require("./utils/generateToken.js");
const protected = require("./utils/authMiddleware.js");
const wrapAsync = require("./utils/wrapAsync.js");
const expressError = require("./utils/expressError.js");
const listingSchema = require("./schema.js");
const Review = require("./models/review.js");
require('dotenv').config();

const port = process.env.PORT;
server.listen(port, ()=>{
    console.log(`server is running on http://localhost:${port}`);
});

main()
.then(()=>{
    console.log('Connected to mongoDB✅');
}).catch((err)=>{
    console.log(err);
})

async function main() {
    await mongoose.connect(`${process.env.MONGO_URL}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

app.engine('ejs', ejsMate);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(flash());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

const listingSchemaValidation = (req, res, next) => {
    const { error } = listingSchema.validate(req.body);
    if(error) {
        const msg = error.details.map(el => el.message).join(', ');
        throw new expressError(400, msg);
    } else {
        next();
    }
}

app.use(wrapAsync(async (req, res, next)=>{
    const token = req.cookies.token;
    if(token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({_id: decoded.id});
        req.user = user;
        res.locals.currUser = user;
    } else {
        req.user = null;
        res.locals.currUser = null;
    }

    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.warning = req.flash("warning");
    next();
}));

app.get('/', (req, res)=>{
    res.redirect("/listings");
})

app.get('/listings', wrapAsync(async (req, res)=>{
    const { q } = req.query;
    let allListings;
    if(q) {
        allListings = await Listing.find({title: {$regex: q, $options: 'i'}});
    } else {
        allListings = await Listing.find({});
    }
    res.render('listings/index', {allListings});
}));

app.get("/listings/filter", wrapAsync(async (req, res)=>{
    const { q } = req.query;
    const fLet = q.split("")[0].toUpperCase();
    const category = fLet + q.slice(1, q.length);
    const listings = await Listing.find({category: q});
    res.render("listings/category.ejs", {listings, category});
}))

app.get('/listings/new', protected, (req, res)=>{
    res.render('listings/new.ejs');
});

app.get('/listings/:id', protected, wrapAsync(async (req, res)=>{
    const user = req.user;
    const {id} = req.params;
    const listing = await Listing.findById(`${id}`).populate("reviews").populate("owner");
    const reviews = await Promise.all(
        listing.reviews.map(async (reviewId) => {
            const populatedReview = await Review.findOne(reviewId).populate("author");
            return populatedReview;
        })
    );
    const location = listing.location;
    const {lat, lon} = await getCoordinates(location);
    if(listing.owner.equals(user._id)) {
        res.locals.validUser = user;
    } else {
        res.locals.validUser = null;
    }
    if (!listing) throw new expressError(404, 'Listing Not Found');
    if(reviews) {
        return res.render('listings/show', {listing, reviews, lat, lon});
    }
    res.render('listings/show', {listing});
}));

app.post('/listings', protected, upload.single("image"), wrapAsync(async (req, res) => {
    const url = req.file.path;
    const filename = req.file.filename;
    const user = req.user;
    const data = new Listing(req.body);
    data.owner = user._id;
    data.image.url = url;
    data.image.filename = filename;
    await data.save();
    req.flash("success", "New Listing Created!");
    res.redirect('/listings');
}));

app.get('/listings/:id/edit', protected, wrapAsync(async (req, res)=>{
    const user = req.user;
    const {id} = req.params;
    const data = await Listing.findById(`${id}`);
    const owner = data.owner._id;
    let originalImageUrl = data.image.url;
    originalImageUrl = originalImageUrl.replace("/upload/", "/upload/h_200,w_300/e_blur:100/");
    if(owner.equals(user._id)) {
        return res.render('listings/edit', {data, originalImageUrl});
    }
    else {
        req.flash("error", "you are not authorized to edit this listing!");
        res.redirect(`/listings/${id}`);
    }
}));

app.put('/listings/:id', protected, upload.single("image"), wrapAsync(async (req, res)=>{
    const url = req.file.path;
    const filename = req.file.filename;
    const {id} = req.params;
    const {title, description, price, location, country} = req.body;
    await Listing.findByIdAndUpdate(`${id}`, {
        title: title,
        description: description,
        image: {
            url: url,
            filename: filename
        },
        price: price,
        location: location,
        country: country
    });
    req.flash("success", "Listing Updated Successfully!")
    res.redirect(`/listings/${id}`);
}));

app.delete('/listings/:id', protected, wrapAsync(async (req, res)=>{
    const user = req.user;
    const {id} = req.params;
    const listing = await Listing.findOne({_id: id});
    const owner = listing.owner._id;
    if(owner.equals(user._id)) {
        listing.reviews.forEach(async (reviewId) => {
            await Review.findByIdAndDelete(reviewId);
        });
        await Listing.findByIdAndDelete(`${id}`);
        if (!listing) throw new expressError(404, 'Listing Not Found');
        res.redirect('/listings');
    } else {
        req.flash("error", "you are not authorized to delete this listing!");
        res.redirect(`/listings/${id}`);
    }
}));

app.post("/listings/:id/review", protected, wrapAsync(async (req, res)=>{
    const user = req.user;
    const {id} = req.params;
    const {review} = req.body;
    const newReview = await Review.create(review);
    newReview.author = user._id;
    newReview.save();
    const listing = await Listing.findOne({_id: id});
    if(!listing) {
        throw new expressError(404, "Listing Not Found!");
    }
    const newReviewId = newReview._id;
    listing.reviews.push(newReviewId);
    await listing.save();
    req.flash("success", "Thanks for your review!")
    res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id/review/:reviewId", protected, wrapAsync(async (req, res)=>{
    const user = req.user;
    const {id, reviewId} = req.params;
    const review = await Review.findById({_id: reviewId}).populate("author");
    const reviewAuthor = review.author._id;
    if(user.equals(reviewAuthor)) {
        await Listing.updateOne({_id: id}, {$pull: {reviews: reviewId}});
        await Review.deleteOne({_id: reviewId});
        req.flash("success", "Review Deleted!")
        return res.redirect(`/listings/${id}`);
    }
    req.flash("error", `you are not the author of this review!`);
    res.redirect(`/listings/${id}`);
}));

app.get("/signup", async (req, res)=>{
    res.render("users/signup.ejs")
});

app.post("/signup", wrapAsync(async (req, res)=>{
    const { username, email, password, confirm } = req.body;
    if(password !== confirm) {
        req.flash("error", "password & confirm password should be same, try again!");
        return res.redirect("/signup");
    }
    const isExist = await User.findOne({username: username});
    console.log(isExist);
    if(isExist) {
        req.flash("warning", "user with given username already exists!");
        return res.redirect("/signup");
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create({
        email: email,
        username: username,
        password: hashedPassword
    });
    const recentUser = await User.findOne({username: username});
    const token = generateToken(recentUser._id);
    res.cookie("token", token);
    req.flash("success", "Welcome to Wanderlust!");
    res.redirect("/listings");
}));

app.get("/login", async (req, res)=>{
    res.render("users/login.ejs");
});

app.post("/login", wrapAsync(async (req, res)=>{
    const { username, password } = req.body;
    const user = await User.findOne({username: username});
    if(!user) {
        req.flash("error", "Password or username is incorrect!")
        return res.redirect("/login");
    }
    const validation = await bcrypt.compare(password, user.password);
    if(!validation) {
        req.flash("error", "Password or username is incorrect!");
        return res.redirect("/login");
    }
    const token = generateToken(user._id);
    res.cookie("token", token);
    const redirectUrl = req.session.returnTo || "/listings";
    delete req.session.returnTo;
    req.flash("success", "Welcome to Wanderlust!");
    res.redirect(redirectUrl);
}));

app.get("/logout", (req, res)=>{
    res.clearCookie("token");
    req.flash("success", "You have been logged out.");
    res.redirect("/listings");
})

app.use((err, req, res, next)=>{
    const { status = 500, message = "Something went wrong" } = err;
    console.log(`Error ${status}: ${message}`);
    res.status(status).render("error.ejs", { message });
});
