const express = require('express');
const { body, param } = require('express-validator');

const homeController = require('../controllers/home');
const isAuth = require('../middleware/isAuth')
const isFan = require('../middleware/isFan')

const router = express.Router()

router.get('/', homeController.getIndex)

router.get('/artists', isAuth, homeController.getArtists)
router.get('/localArtists', isAuth, homeController.getLocalArtists)
router.get('/artist/:artistName', homeController.getArtist)
router.post('/contact/:artistName', homeController.postContactArtist)


router.get('/releases', homeController.getReleases)
router.get('/localReleases', homeController.getLocalReleases)
router.get('/release/:songName/:artistName', homeController.getRelease)


router.get('/seasons', homeController.getSeasons)
router.get('/season/:seasonNumber', homeController.getSeason)


router.get('/profile', homeController.getProfile)
router.post('/edit-profile', homeController.postEditProfile)

router.get('/news', homeController.getNews)

router.get('/voting',  isFan, homeController.getVoting)
router.get('/voting/:songName/:artistName', homeController.getSongForVoting)
router.post('/cast-vote/:songName', homeController.postCastVote)

router.post('/checkout',
  [
      body('title')
      .isString()
      .isLength({ min: 3 })
      .withMessage('Song title must be at least 3 characters')
      .trim(),
      body('songUrl')
        .custom((value, {req}) => {
          if (!value.includes('https://youtu.be/')){
            throw new Error("Shared YouTube song URL must start like this ('https://youtu.be/') and can be found when clicking the 'Share' button on your youtube video.");
          }
          return true
        })
        .isString(),
      body('genre').isString()
  ],
  isAuth,
  homeController.postGetCheckout
);
router.get('/checkout/success', homeController.getCheckoutSuccess);
router.get('/checkout/cancel', homeController.postGetCheckout);

router.post('/adcheckout', isAuth, homeController.postGetAdCheckout)

router.post('/createAdvertisement',
  [
    body('affiliateLink')
      .isString(),
    body('adTitle')
    .isString()
    .isLength({ min: 3 })
    .withMessage('Advertisement title must be at least 3 characters')
    .trim(),
    body('adDescription')
      .isLength({ max: 50 })
      .isString(),
  ],
  isAuth,
  homeController.createAdvertisement

)

router.get('/about', homeController.getAbout)

router.get('/pricing', homeController.getPricing)

router.get('/privacy', homeController.getPrivacy)


module.exports = router;