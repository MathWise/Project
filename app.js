const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { initBuckets } = require('./config/gridFS.js');
const path = require('path');
const User = require('./models/user.js');
const connectDB = require('./config/dbConnection');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const usersignup = require('./routes/usersignup.js'); 
const userslogin = require('./routes/userslogin.js');
const forgetPassRoutes = require('./routes/forgetpassword.js');
const archiveLessonRoomRoutes = require('./routes/archiveLessonRoomRoutes');
const archiveMediaRoutes = require('./routes/archiveMediaRoutes');
const adRoutes = require("./routes/admin.js");
const appRoutes = require("./routes/user.js");
const passport = require('passport');
const mongoose = require('mongoose');
require('./config/passport')(passport);

console.log('MongoDB URI:', process.env.MONGODB_URI);
connectDB()
.then(() => {
  console.log('Database connected successfully');
  return initBuckets(); // Ensure buckets are initialized after DB connection
})
.then(() => {
  console.log('GridFS Buckets initialized successfully');
})
.catch((error) => {
  console.error('Error during app initialization:', error);
  process.exit(1); // Exit the app if DB connection or bucket initialization fails
});

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize the GridFS buckets
initBuckets()
    .then(() => {
        console.log('GridFS Buckets initialized successfully');
    })
    .catch((error) => {
        console.error('Failed to initialize GridFS Buckets', error);
        process.exit(1);
    });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware should be defined before passport middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // Session expires after 1 day
  }
}));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log('Success Messages:', req.flash('success'));
  console.log('Error Messages:', req.flash('error'));
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');

  next();
});

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
app.use('/admin', adRoutes);
app.use('/user', appRoutes);

app.use('/admin', archiveLessonRoomRoutes);
app.use('/admin', archiveMediaRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
