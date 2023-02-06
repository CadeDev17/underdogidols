require('dotenv').config()
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');


const User = require('../models/user');
const Song = require('../models/song')
const Ad = require('../models/ad')

const currentSeason = 2

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        process.env.NODEMAILER_API_KEY
    }
  })
);

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
        pageTitle: "Underdog Signup",
        errorMessage: ''
    })
}

exports.postGetCorrectSignup = (req, res, next) => {
    const userType = req.body.userType
    if (userType === 'Contestant') {
        res.render('auth/contestantsignup', {
            pageTitle: "Underdog Signup",
            errorMessage: '',
            userType: userType,
            ads: '',
            oldInput: {
              name: '',
              instagram: '',
              tiktok: '',
              bio: '',
              email: ''
            }
        })
    } else if (userType === 'Fan') {
      res.render('auth/fansignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType,
        ads: ''
      })
    } else if (userType === 'RecordLabelCompany') {
      res.render('auth/recordcompanysignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType,
        ads: '',
        oldInput: {
          name: '',
          recordLabel: '',
          companyAddress: '',
          phoneNumber: '',
          email: ''
        }
      })
    } else if (userType === 'Advertiser') {
      res.render('auth/advertisersignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType,
        ads: '',
        oldInput: {
          name: '',
          companyName: '',
          companyAddress: '',
          phoneNumber: '',
          companyURL: '',
          email: ''
        }
      })
    }
}

exports.postSignup = (req, res, next) => {
  const userType = req.params.userType
  const name = req.body.name
  const email = req.body.email
  const homeState = req.body.homeState
  const password = req.body.password
  const genre = req.body.genre
  const instagram = req.body.instagram
  const tiktok = req.body.tiktok
  const bio = req.body.bio
  const recordLabel = req.body.recordLabel
  const companyAddress = req.body.companyAddress
  const phoneNumber = req.body.phoneNumber
  const companyName = req.body.companyName
  const companyURL = req.body.companyURL
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (userType === 'Fan') {
      return res.render('auth/fansignup.ejs', {
        pageTitle: 'Signup',
        errorMessage: errors.array()[0].msg
      });
    } else if (userType === 'Contestant') {
      return res.render('auth/contestantsignup.ejs', {
        pageTitle: 'Signup',
        userType: 'Contestant',
        ads: '',
        errorMessage: errors.array()[0].msg,
        oldInput: {
          name: name,
          instagram: instagram,
          tiktok: tiktok,
          bio: bio,
          email: email
        }
      });
    } else if (userType === 'RecordLabelCompany') {
      return res.render('auth/recordcompanysignup.ejs', {
        pageTitle: 'Signup',
        userType: 'RecordLabelCompany',
        ads: '',
        errorMessage: errors.array()[0].msg,
        oldInput: {
          name: name,
          recordLabel: recordLabel,
          companyAddress: companyAddress,
          phoneNumber: phoneNumber,
          email: email
        }
      });
    } else if (userType === 'Advertiser') {
      return res.render('auth/advertisersignup.ejs', {
        pageTitle: 'Signup',
        userType: 'Advertiser',
        ads: '',
        errorMessage: errors.array()[0].msg,
        oldInput: {
          name: name,
          companyName: companyName,
          companyAddress: companyAddress,
          phoneNumber: phoneNumber,
          companyURL: companyURL,
          email: email
        }
      })
    }
  }
  bcrypt
  .hash(password, 12)
  .then(hashedPassword => {
    if (userType === 'Contestant') {
      const user = new User({
          name: name,
          email: email,
          homeState: homeState,
          password: hashedPassword,
          userType: userType,
          preferredGenre: genre,
          instagram: instagram ? instagram : 'N/A',
          tiktok: tiktok ? tiktok : 'N/A',
          bio: bio,
          userProfileImage: req.file ? req.file.path : 'img/avatar.svg',
          isPremiumUser: false,
          songs: [],
          ads: ''
      })
      return user.save()
    } else if (userType === 'Fan') {
      const user = new User({
        email: email,
        password: hashedPassword,
        userType: userType,
        songs: [],
        ads: ''
      })
      return user.save()
    } else if (userType === 'RecordLabelCompany') {
      const user = new User({
        name: name,
        email: email,
        password: hashedPassword,
        userType: userType,
        preferredGenre: genre,
        phoneNumber: phoneNumber,
        companyAddress: companyAddress,
        recordLabel: recordLabel,
        userProfileImage: 'img/avatar.svg',
        songs: [],
        ads: ''
      })
      return user.save()
    } else if (userType === 'Advertiser') {
      const user = new User({
        name: name,
        email: email,
        password: hashedPassword,
        userType: userType,
        homeState: homeState,
        companyName: companyName,
        companyURL: companyURL,
        companyAddress: companyAddress,
        phoneNumber: phoneNumber,
        contactsAvailable: 0,
        songs: [],
        ads: ''
      })
      return user.save()
    }
  })
  .then(result => {
      res.redirect('/signin')
  })
  .catch(err => {
      const error = new Error(err);
  })
}

exports.getSignin = (req, res, next) => {
    res.render('auth/signin', {
        pageTitle: "Signin", 
        errorMessage: '',
    })
}

exports.postSignin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signin', {
            pageTitle: 'Sign-in',
            errorMessage: errors.array()[0].msg
        });
    }

    User.findOne({ email: email })
        .then(user => {
        if (!user) {
            return res.status(422).render('auth/signin', {
                pageTitle: 'Sign-in',
                errorMessage: 'Invalid email or password.'
            });
        }
        bcrypt
            .compare(password, user.password)
            .then(doMatch => {
                if (doMatch) {
                    req.session.isLoggedIn = true;
                    req.session.userType = user.userType
                    req.session.user = user;
                    return req.session.save(err => {
                    console.log(err);
                    res.redirect('/');
                    });
                }
                return res.status(422).render('auth/signin', {
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password.'
                });
            })
            .catch(err => {
            res.redirect('/profile');
            });
        })
        .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
        });
}

exports.postChangePassword = (req, res, next) => {
    const newPass = req.body.newpass
    let count = 0
    req.user.songs.forEach(song => {
        count = count + song.votes
    })
    bcrypt.compare(req.body.oldpass, req.user.password)
        .then(doMatch => {
            if (doMatch) {
                User.findById(req.user._id)
                    .then(user => {
                        bcrypt.hash(newPass, 12)
                            .then(hashedPass => {
                                user.password = hashedPass
                                user.save()
                                let url = '/profile'
                                if (req.user.userType === 'Contestant') {
                                  User.find({ name: req.user.name })
                                    .then(user => {
                                        Ad.find({ isGoldAd: true })
                                            .then(goldAds => {
                                                Ad.find({ isGoldAd: true, adHomeState: req.user.homeState })
                                                    .then(goldAdsByState => {
                                                        res.render('home/profile', {
                                                            pageTitle: "Underdog Profile",
                                                            userType: req.user.userType,
                                                            username: req.user.name,
                                                            email: req.user.email,
                                                            preferredGenre: req.user.preferredGenre,
                                                            errorMessage: '',
                                                            successMessage: 'Password Updated Successfully!',
                                                            instagram: req.user.instagram,
                                                            tiktok: req.user.tiktok,
                                                            bio: req.user.bio,
                                                            votes: count,
                                                            userProfileImage: req.user.userProfileImage,
                                                            userSongs: user[0].songs,
                                                            isPremiumUser: user[0].isPremiumUser,
                                                            goldAds: goldAds,
                                                            goldAdsByState: goldAdsByState,
                                                            sessionId: '',
                                                            currentSeason: currentSeason,
                                                            ads: ''
                                                        })
                                                    })
                                            })
                                    })
                                } else if (req.user.userType === 'RecordLabelCompany') {
                                    res.render('home/recordlabelprofile', {
                                        pageTitle: "Record Label Profile",
                                        userType: req.user.userType,
                                        username: req.user.name,
                                        email: req.user.email,
                                        preferredGenre: req.user.preferredGenre,
                                        errorMessage: '',
                                        successMessage: 'Password Updated Successfully',
                                        recordLabel: req.user.recordLabel,
                                        phoneNumber: req.user.phoneNumber,
                                        companyAddress: req.user.companyAddress,
                                        votes: count,
                                        userProfileImage: req.user.userProfileImage,
                                        contactedArtists: req.user.songs,
                                        sessionId: '',
                                        currentSeason: currentSeason,
                                        ads: ''
                                    })
                                } else if (req.user.userType === 'Advertiser'){
                                    Ad.find()
                                        .then(allAds => {
                                            res.render('home/advertiserprofile', {
                                                pageTitle: "Advertiser Profile",
                                                userType: req.user.userType,
                                                username: req.user.name,
                                                email: req.user.email,
                                                ads: req.user.songs,
                                                allAds: allAds,
                                                errorMessage: '',
                                                successMessage: 'Password Updated Successfully',
                                                phoneNumber: req.user.phoneNumber,
                                                companyAddress: req.user.companyAddress,
                                                sessionId: '',
                                                isBronzeAd: req.user.isBronzeAd,
                                                isSilverAd: req.user.isSilverAd,
                                                isGoldAd: req.user.isGoldAd,
                                                homeState: req.user.homeState,
                                                currentSeason: currentSeason,
                                            })
                                        })
                                }
                            })
                    })
            } else {
              if (req.user.userType === 'Contestant') {
                User.find({ name: req.user.name })
                  .then(user => {
                      Ad.find({ isGoldAd: true })
                          .then(goldAds => {
                              Ad.find({ isGoldAd: true, adHomeState: req.user.homeState })
                                  .then(goldAdsByState => {
                                      res.render('home/profile', {
                                          pageTitle: "Underdog Profile",
                                          userType: req.user.userType,
                                          username: req.user.name,
                                          email: req.user.email,
                                          preferredGenre: req.user.preferredGenre,
                                          errorMessage: 'Old Password Incorrect or Passwords Do Not Match',
                                          successMessage: '',
                                          instagram: req.user.instagram,
                                          tiktok: req.user.tiktok,
                                          bio: req.user.bio,
                                          votes: count,
                                          userProfileImage: req.user.userProfileImage,
                                          userSongs: user[0].songs,
                                          isPremiumUser: user[0].isPremiumUser,
                                          goldAds: goldAds,
                                          goldAdsByState: goldAdsByState,
                                          sessionId: '',
                                          currentSeason: currentSeason,
                                          ads: ''
                                      })
                                  })
                          })
                  })
              } else if (req.user.userType === 'RecordLabelCompany') {
                  res.render('home/recordlabelprofile', {
                      pageTitle: "Record Label Profile",
                      userType: req.user.userType,
                      username: req.user.name,
                      email: req.user.email,
                      preferredGenre: req.user.preferredGenre,
                      errorMessage: 'Old Password Incorrect or Passwords Do Not Match',
                      successMessage: '',
                      recordLabel: req.user.recordLabel,
                      phoneNumber: req.user.phoneNumber,
                      companyAddress: req.user.companyAddress,
                      votes: count,
                      userProfileImage: req.user.userProfileImage,
                      contactedArtists: req.user.songs,
                      sessionId: '',
                      currentSeason: currentSeason,
                      ads: ''
                  })
              } else if (req.user.userType === 'Advertiser'){
                  Ad.find()
                      .then(allAds => {
                          res.render('home/advertiserprofile', {
                              pageTitle: "Advertiser Profile",
                              userType: req.user.userType,
                              username: req.user.name,
                              email: req.user.email,
                              ads: req.user.songs,
                              allAds: allAds,
                              errorMessage: 'Old Password Incorrect or Passwords Do Not Match',
                              successMessage: '',
                              phoneNumber: req.user.phoneNumber,
                              companyAddress: req.user.companyAddress,
                              sessionId: '',
                              isBronzeAd: req.user.isBronzeAd,
                              isSilverAd: req.user.isSilverAd,
                              isGoldAd: req.user.isGoldAd,
                              homeState: req.user.homeState,
                              currentSeason: currentSeason,
                          })
                      })
              }
            }
        })

}

exports.postEditSong = (req, res, next) => {
  const newTitle = req.body.newTitle
  const newGenre = req.body.newGenre
  const newSongUrl = req.body.newSongUrl
  const newYoutubeSongId = newSongUrl.split('=')
  User.findById(req.user._id)
    .then(user => {
      user.songs.forEach(userSong => {
        if (userSong.season === currentSeason) {
          Song.find({ youtubeSongId: userSong.youtubeSongId })
            .then(correctSong => {
              correctSong[0].songTitle = newTitle
              correctSong[0].songGenre = newGenre
              correctSong[0].youtubeSongId = newYoutubeSongId[newYoutubeSongId.length - 1]
              correctSong[0].save()
            })
            userSong.songTitle = newTitle
            userSong.songGenre = newGenre
            userSong.youtubeSongId = newYoutubeSongId[newYoutubeSongId.length - 1]
        }
        user.save()
        res.redirect('/profile')
      })
    })
}

exports.postEditAd = (req, res, next) => {
  const newAdTitle = req.body.newAdTitle
  const newAdDescription = req.body.newAdDescription.trim()
  const newAffiliateLink = req.body.newAffiliateLink
  User.find({ userType: 'Advertiser', name: req.user.name })
    .then(user => {
      Ad.find({ adTitle: user[0].songs[0].adTitle })
        .then(correctAd => {
          correctAd[0].adTitle = newAdTitle
          correctAd[0].adDescription = newAdDescription
          correctAd[0].adAffiliateLink = newAffiliateLink
          correctAd[0].save()
        })
    
      user[0].songs[0].adTitle = newAdTitle
      user[0].songs[0].adDescription = newAdDescription
      user[0].songs[0].adAffiliateLink = newAffiliateLink
      user[0].save()
      res.redirect('/profile')
    })
}

exports.getForgot = (req, res, next) => {
    res.render('auth/forgot', {
        pageTitle: 'Forgot Password',
        errorMessage: '',
        successMessage: '',
        ads: ''
    })
}

exports.postForgot = (req, res, next) => {
    const email = req.body.email
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
          console.log(err);
          return res.redirect('/forgot');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: email })
            .then(userFound => {
                if (!userFound){
                    res.render('auth/forgot', {
                        pageTitle: "Forgot Password",
                        errorMessage: 'Email not connected to any account.',
                        successMessage: '',
                        ads: ''
                    })
                }
                userFound.resetToken = token;
                userFound.resetTokenExpiration = Date.now() + 3600000;
                return userFound.save();
            })
            .then(result => {
                res.render('auth/forgot', {
                    pageTitle: 'Forgot Password',
                    errorMessage:'',
                    successMessage: 'Check the email associated with your account.',
                    ads: ''
                });
                transporter.sendMail({
                  to: email,
                  from: 'supprtunderdogidols@gmail.com',
                  subject: 'Password Reset',
                  html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="https://underdogidols.com/forgot/${token}">link</a> to set a new password.</p>
                  `
                });
            })
            .catch(err => {
                console.log(err)
            })
    })
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        console.log(err);
        return res.redirect('/reset');
      }
      const token = buffer.toString('hex');
      User.findOne({ email: req.body.email })
        .then(user => {
          if (!user) {
            req.flash('error', 'No account with that email found.');
            return res.redirect('/reset');
          }
          user.resetToken = token;
          user.resetTokenExpiration = Date.now() + 3600000;
          return user.save();
        })
        .then(result => {
          res.redirect('/');
          transporter.sendMail({
            to: req.body.email,
            from: 'shop@node-complete.com',
            subject: 'Password reset',
            html: `
              <p>You requested a password reset</p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
            `
          });
        })
        .catch(err => {
          new Error(err);
        });
    });
  };
  
exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      res.render('auth/new-password', {
        pageTitle: 'New Password',
        errorMessage: '',
        userType: user.userType,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      new Error(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.newpassword;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(result => {
      res.redirect('/signin');
    })
    .catch(err => {
      new Error(err);
    });
};