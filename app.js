// TODO's
// - Work on the different availabilities based on the usertype


const mongoose = require('mongoose');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const multer = require('multer')
const passport = require('passport')
const facebookStrategy = require('passport-facebook').Strategy
const csrf = require('csurf')

const User = require('./models/user')
const homeRoutes = require('./routes/home')
const authRoutes = require('./routes/auth')
const webhookRoutes = require('./routes/webhooks')


const MONGODB_URI =
  'mongodb+srv://UnderdogIdols:Yko35961@underdogidols.qzsdy10.mongodb.net/home';
  
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf()

app.set('view engine', 'ejs');
app.set('views', 'views');


const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'text/html'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('userProfileImage'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/forgot', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use((req, res, next) => {
  if (req.session.passport){
    res.locals.isAuthenticated = req.session.passport.user[0].fanLoggedIn
    res.locals.userTypeLocals = req.session.passport.user[0].userType
  } else {
    res.locals.isAuthenticated = req.session.isLoggedIn
    res.locals.userTypeLocals = req.session.userType
  }

  // res.locals.csrfToken = req.csrfToken()

  if (req.session.userType === 'Advertiser') {
    res.locals.isGoldAd = req.session.user.isGoldAd
  } else {
    res.locals.isGoldAd = false
  }
  next();
});
  
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use(homeRoutes)
app.use(authRoutes)
app.use(webhookRoutes)

app.use(passport.initialize())
app.use(passport.session())

passport.use(new facebookStrategy({
  clientID: '661182905697592',
  clientSecret: '5ce0981ec008eaf2f942944d6ae9e417',
  callbackURL: 'http://localhost:3000/facebook/callback',
  profileFields: ['id', 'name', 'email']
},
function(token, refreshToken, profile, done) {
  User.find({ email: profile._json.email })
    .then(user => {
      if (!user[0]) {
        const newUser = new User({
          email: profile._json.email,
          userType: 'Fan',
          fanLoggedIn: true,
          songs: []
        })
        newUser.save()
        return done(null, newUser)
      } else {
        return done(null, user)
      }
    })
}))

app.get('/auth/facebook', passport.authenticate('facebook', {scope: 'email'}))

app.get('/facebook/callback', passport.authenticate('facebook', {
  successRedirect: '/',
  failureRedirect: '/signup'
}))

app.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy(err => {
      console.log(err)
      res.redirect('/')
    })
  });
});

passport.serializeUser(function(user, done) {
  done(null, user)
})

passport.deserializeUser(function(id, done) {
  return done(null, id)
})

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });