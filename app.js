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
  secret: 'yourSecret', // Replace with your own secret
  resave: false,
  saveUninitialized: true
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use((req, res, next) => {
  res.locals.successMessage = req.flash('success');
  res.locals.error = req.flash('error');
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


// Temporary logging middleware to confirm admin routes are accessed
app.use('/admin', (req, res, next) => {
  console.log('Admin route accessed:', req.path);
  next();
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
