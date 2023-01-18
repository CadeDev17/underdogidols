const path = require('path');
const express = require('express');
const authController = require('../controllers/auth');
const { check, body } = require('express-validator');
const isAuth = require('../middleware/isAuth')

const User = require('../models/user')

const router = express.Router()

router.get('/signup', authController.getSignup)

router.post('/correct-signup', authController.postGetCorrectSignup)

router.post('/signup/:userType',
    [
        check('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, { req }) => {
            return User.findOne({ email: value }).then(userDoc => {
            if (userDoc) {
                return Promise.reject(
                'E-Mail exists already, please pick a different one.'
                );
            }
            });
        })
        .normalizeEmail(),
        body(
        'password',
        'Password must be alphanumeric and at least 5 characters.'
        )
        .isLength({ min: 5 })
        .isAlphanumeric()
        .trim(),
        body('confirmPassword')
        .trim()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
            throw new Error('Passwords have to match!');
            }
            return true;
        })
    ], authController.postSignup
);

router.get('/signin', authController.getSignin)

router.post('/signin', 
    [
        body('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .normalizeEmail(),
        body('password', 'Password has to be valid.')
        .isLength({ min: 5 })
        .isAlphanumeric()
        .trim()
    ],
    authController.postSignin
);

router.post('/change-password', 
    [
        body(
            'password',
            'Password must be alphanumeric and at least 5 characters.'
            )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
            body('confirmPassword')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                throw new Error('Passwords have to match!');
                }
                return true;
            })
    ], 
    isAuth, 
    authController.postChangePassword
)

router.post('/edit-song',
    [
        body('newTitle')
        .isString()
        .isLength({ min: 3 })
        .withMessage('Song title must be at least 3 characters')
        .trim(),
        body('newSongUrl')
        .custom((value, {req}) => {
            if (!value.includes('https://youtu.be/')){
            throw new Error("Shared YouTube song URL must start like this ('https://youtu.be/') and can be found when clicking the 'Share' button on your youtube video.");
            }
            return true
        })
        .isString(),
        body('newGenre').isString()
    ],
    isAuth,
    authController.postEditSong
)

router.post('/edit-ad',
[
    body('newAffiliateLink')
      .isString(),
    body('newAdTitle')
    .isString()
    .isLength({ min: 3 })
    .withMessage('Advertisement title must be at least 3 characters')
    .trim(),
    body('newDescription')
      .isLength({ max: 50 })
      .isString(),
  ],
  isAuth,
  authController.postEditAd
)

router.get('/forgot', authController.getForgot)

router.post('/forgot', authController.postForgot)

router.get('/forgot/:token', authController.getNewPassword);

router.post('/new-password', 
    [
        body(
            'newpassword',
            'Password must be alphanumeric and at least 5 characters.'
            )
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim(),
            body('confirmpass')
            .trim()
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                throw new Error('Passwords have to match!');
                }
                return true;
            })
    ],
    authController.postNewPassword
);

module.exports = router