const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const { initBuckets } = require('./config/gridFS.js');
const { initActivityBucket } = require('./config/activityGridFS');
const activityRoutes = require('./routes/activitySec');
const userActivityRoutes = require('./routes/userActivitySec');
const fileActivityRoutes = require('./routes/fileActivity');
const path = require('path');
const User = require('./models/user.js');
const connectDB = require('./config/dbConnection');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const usersignup = require('./routes/usersignup.js'); 
const userslogin = require('./routes/userslogin.js');
const forgetPassRoutes = require('./routes/forgetpassword.js');
const roomFPasswordRoutes = require('./routes/roomFPassword');
const archiveLessonRoomRoutes = require('./routes/archiveLessonRoomRoutes');
const pdfDelete = require('./routes/pdfDelete');
const archiveMediaRoutes = require('./routes/archiveMediaRoutes');
const defaultRoomRoutes = require('./routes/defaultRoom');
const deleteQuizRoutes = require('./routes/deleteQuiz');
const roomDeleteRoutes = require('./routes/roomDelete')
const adRoutes = require("./routes/admin.js");
const appRoutes = require("./routes/user.js");
const passport = require('passport');
const mongoose = require('mongoose');
require('./config/passport')(passport);

console.log('MongoDB URI:', process.env.MONGODB_URI);
// Initialize database and GridFS buckets
connectDB()
    .then(async () => {
        console.log('Database connected successfully');
        await initBuckets(); // Initialize GridFS buckets after DB connection
        console.log('GridFS Buckets initialized successfully');
    })
    .catch((error) => {
        console.error('Error during app initialization:', error);
        process.exit(1); // Exit the app if DB connection or bucket initialization fails
    });
    
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize Activity GridFS bucket
(async () => {
  try {
      await initActivityBucket(); // Initialize the activity bucket
      console.log('Activity GridFS bucket initialized successfully');
  } catch (error) {
      console.error('Failed to initialize Activity GridFS bucket:', error);
      process.exit(1);
  }
})();

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

const corsOptions = {
  origin: 'http://localhost:8080',  // Allow only requests from this origin (adjust to your frontend's URL)
  methods: ['GET', 'POST', 'DELETE'],  // Allow only specific HTTP methods
  allowedHeaders: ['Content-Type'],  // Allow specific headers
};

app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));

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
app.use('/admin', deleteQuizRoutes);
app.use('/admin', archiveLessonRoomRoutes);
app.use('/admin', archiveMediaRoutes);
app.use('/admin', pdfDelete);
app.use('/user', userActivityRoutes);
app.use('/admin', defaultRoomRoutes);
app.use('/admin', activityRoutes);
app.use('/', fileActivityRoutes);
app.use(roomFPasswordRoutes);
app.use('/admin', roomDeleteRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
