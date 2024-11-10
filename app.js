const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const path = require('path');
const User = require('./models/user.js');
const connectDB = require('./config/dbConnection');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const usersignup = require('./routes/usersignup.js'); 
const userslogin = require('./routes/userslogin.js');
const forgetPassRoutes = require('./routes/forgetpassword.js');
const adRoutes = require("./routes/admin.js");
const appRoutes = require("./routes/user.js");
const passport = require('passport');
require('./config/passport')(passport);


console.log('MongoDB URI:', process.env.MONGODB_URI);
connectDB();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory explicitly

app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware should be defined before passport middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecret', // Replace with your own secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // Ensures cookies are sent over HTTPS in production
    httpOnly: true,  // Prevent JavaScript from accessing cookies
    maxAge: 24 * 60 * 60 * 1000  // Session expires after 1 day
  }
  
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());


app.use((req, res, next) => {
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');
  res.locals.warningMessage = req.flash('warning');
  next();
});

// Cache control middleware to prevent caching of protected routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.get("/", (req, res) => {
  res.render("login");
});

// Define your routes
app.use('/', usersignup);
app.use('/', userslogin);
app.use(forgetPassRoutes);
app.use('/admin',adRoutes);
app.use('/user',appRoutes);



const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
