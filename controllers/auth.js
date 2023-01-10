const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');


const User = require('../models/user');
const { isContext } = require('vm');

const PREMIUM_SUBSCRIPTION = 'prod_N0ndsPTMEa8OqO'

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        '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'
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
            userType: userType
        })
    } else if (userType === 'Fan') {
      res.render('auth/fansignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType
      })
    } else if (userType === 'RecordLabelCompany') {
      res.render('auth/recordcompanysignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType
      })
    } else if (userType === 'Advertiser') {
      res.render('auth/advertisersignup', {
        pageTitle: "Underdog Signup",
        errorMessage: '',
        userType: userType
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
    return res.render('auth/signup', {
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg
    });
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
          songs: []
      })
      return user.save()
    } else if (userType === 'Fan') {
      const user = new User({
        email: email,
        password: hashedPassword,
        userType: userType,
        songs: []
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
        songs: []
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
        songs: []
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

// exports.postSignout = (req, res, next) => {
//   if (req.session.passport.user[0].userType === 'Fan') {
//     req.logout(function(err) {
//       if (err) { return next(err); }
//       res.redirect('/')
//     })
//   } else {
//     req.session.destroy(err => {
//         console.log(err);
//         res.redirect('/');
//       });
//   }
// }

exports.postChangePassword = (req, res, next) => {
    const newPass = req.body.newpass
    bcrypt.compare(req.body.oldpass, req.user.password)
        .then(doMatch => {
            if (doMatch) {
                User.findById(req.user._id)
                    .then(user => {
                        bcrypt.hash(newPass, 12)
                            .then(hashedPass => {
                                user.password = hashedPass
                                user.save()
                                res.redirect('/profile')
                            })
                    })
            }
        })

}

exports.getForgot = (req, res, next) => {
    res.render('auth/forgot', {
        pageTitle: 'Forgot Password',
        errorMessage: '',
        successMessage: ''
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
                        successMessage: ''
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
                    successMessage: 'Check the email associated with your account.'
                });
                transporter.sendMail({
                  to: email,
                  from: 'theunderdogidols@gmail.com',
                  subject: 'Password Reset',
                  html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href="http://localhost:3000/forgot/${token}">link</a> to set a new password.</p>
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