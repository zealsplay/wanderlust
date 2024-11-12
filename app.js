if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
} 

// Basic database setup
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path"); 
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate"); 
const ExpressError = require("./utils/ExpressError.js");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// MongoDB Atlas Server
const dbUrl = process.env.ATLAS_URL;

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.error("Error connecting to DB:", err);
    });

async function main() {
    await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        tlsAllowInvalidCertificates: true,
    });
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.error("ERROR in MONGO SESSION STORE:", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET || 'fallbackSecretKey',
    resave: false,
    saveUninitialized: true,
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found!!"));
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Something went wrong";
    res.status(statusCode).send(err.message);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
