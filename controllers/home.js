const User = require('../models/user')
const Song = require('../models/song')
const Ad = require('../models/ad')

const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const stripe = require('stripe')('sk_test_51MExl4Bb37tvGgw4uz30OfIgeaj25SqwyLtHTW0E7yq5zZJCzs4ihjjEq17h3JP4iAUBQRx9Gzi9JfJULl8Y0twk00x3LBiZry')

const currentSeason = 2
const nextSeason = currentSeason + 1
const previousSeason = currentSeason - 1

const transporter = nodemailer.createTransport(
    sendgridTransport({
      auth: {
        api_key:
          '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'
      }
    })
  );

function scheduleReset() {
    // get current time
    let reset = new Date();
    // update the Hours, mins, secs to the 24th hour (which is when the next day starts)
    reset.setHours(24, 0, 0, 0);
    // calc amount of time until restart
    let t = reset.getTime() - Date.now();
    setTimeout(function() {
        // reset variable
        myVar = 1;
        User.find({ userType: 'Advertiser' })
            .then(advertiser => {
                if (advertiser.isGoldAd){
                    advertiser.contactsAvailable = 20
                } else if (advertiser.isSilverAd) {
                    advertiser.contactsAvailable = 10
                } else if (advertiser.isBronzeAd) {
                    advertiser.contactsAvailable = 10
                }
            })
        // schedule the next variable reset
        scheduleReset();
    }, t);
}
scheduleReset();

exports.getIndex = (req, res, next) => {
    if (req.session.userType === 'RecordLabelCompany') {
        User.find()
            .then(artists => {
                Song.find({ season: {'$lt': currentSeason + 1} })
                    .then(songs => {
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let currSeasonTopSongs = []
                        let prevSeasonTopSongs = []
                        topSongs.forEach(song => {
                            if (song.season === currentSeason) {
                                currSeasonTopSongs.push(song)
                            } else if (song.season === previousSeason) {
                                prevSeasonTopSongs.push(song)
                            }
                        })
                        res.render('home/recordlabelindex', {
                            pageTitle: 'UnderdogIdols Home',
                            currSeasonTopSongs: currSeasonTopSongs.slice(0, 6),
                            prevSeasonTopSongs: prevSeasonTopSongs.slice(0, 6),
                            userType: req.user.userType,
                            artists: artists
                        })
                })
            })
    } else {
        User.find()
            .then(artists => {
                Song.find({ season: currentSeason })
                    .then(songs => {
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let mostRecentSongs = songs.slice(-7)
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/index', {
                                    pageTitle: 'UnderdogIdols Home',
                                    currentSeason: currentSeason,
                                    mostRecentSongs: mostRecentSongs,
                                    topFiveSongs: topFiveSongs,
                                    ads: ads,
                                    artists: artists
                                })
                            })
                })
            })
    }


}

exports.getArtists = (req, res, next) => {
    User.find()
        .then(artists => {
            Ad.find({ isSilverAd: true })
                .then(silverAds => {
                    res.render('home/artists', {
                        pageTitle: "Underdog Artists",
                        artists: artists,
                        silverAds: silverAds
                    })
                })
        })
}

exports.getLocalArtists = (req, res, next) => {
    User.find({ homeState: req.user.homeState })
        .then(artists => {
            Ad.find({ isSilverAd: true })
                .then(silverAds => {
                    res.render('home/localartists', {
                        pageTitle: "Underdog Artists",
                        artists: artists,
                        silverAds: silverAds
                    })
                })
        })
}

exports.getArtist = (req, res, next) => {
    const artistName = req.params.artistName
    if (req.user.userType === 'Advertiser') {
        User.findOne({ name: req.user.name })
            .then(advertiser => {
                console.log(advertiser)
                User.findOne({ name: artistName })
                    .then(artist => {
                        res.render('home/artist', {
                            pageTitle: "Underdog Artist",
                            artist: artist,
                            userType: req.user.userType ? req.user.userType : '' ,
                            errorMessage: '',
                            successMessage: '',
                            advertiserContactsAvailable: advertiser.contactsAvailable
                        })
                    })
            })
    } else {
        User.findOne({ name: artistName })
            .then(artist => {
                res.render('home/artist', {
                    pageTitle: "Underdog Artist",
                    artist: artist,
                    userType: req.user.userType ? req.user.userType : '' ,
                    errorMessage: '',
                    successMessage: '',
                    advertiserContactsAvailable: 20
                })
            })
    }

}

exports.postContactArtist = (req, res, next) => {
    const artistName = req.params.artistName
    let message = req.body.message

    if (req.user.userType === 'Advertiser'){
        const contactsAvailable = req.user.contactsAvailable
        req.user.contactsAvailable = contactsAvailable - 1
        req.user.save()
    }
    User.find({ name: artistName })
        .then(artist => {
            if (req.user.userType === 'RecordLabelCompany') {
                req.user.songs.push({
                    artistName: artist[0].name
                })
                req.user.save()
                console.log(req.user.songs)
            }
            res.render('home/artist', {
                pageTitle: "Underdog Artist",
                artist: artist[0],
                errorMessage: '',
                userType: req.user.userType,
                advertiserContactsAvailable: 20,
                successMessage: 'Your message has been sent. Responses will be sent to your accounts email.'
            })
            transporter.sendMail({
                to: 'decryptr22@gmail.com',
                from: 'theunderdogidols@gmail.com',
                subject: 'Record Label Message',
                html: `
                  <p>${message}</p>
                `
              });
        })
}

exports.getProfile = (req, res, next) => {
    let count = 0
    req.user.songs.forEach(song => {
        count = count + song.votes
    })
    if (req.user.userType === 'Contestant') {
        Ad.find({ isGoldAd: true, adHomeState: req.user.homeState })
            .then(goldAds => {
                res.render('home/profile', {
                    pageTitle: "Underdog Profile",
                    userType: req.user.userType,
                    username: req.user.name,
                    email: req.user.email,
                    preferredGenre: req.user.preferredGenre,
                    errorMessage: '',
                    instagram: req.user.instagram,
                    tiktok: req.user.tiktok,
                    bio: req.user.bio,
                    votes: count,
                    userProfileImage: req.user.userProfileImage,
                    userSongs: req.user.songs,
                    isPremiumUser: req.user.isPremiumUser,
                    goldAds: goldAds,
                    sessionId: '',
                    currentSeason: currentSeason
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
            recordLabel: req.user.recordLabel,
            phoneNumber: req.user.phoneNumber,
            companyAddress: req.user.companyAddress,
            votes: count,
            userProfileImage: req.user.userProfileImage,
            contactedArtists: req.user.songs,
            sessionId: '',
            currentSeason: currentSeason
        })
    } else if (req.user.userType === 'Advertiser'){
        res.render('home/advertiserprofile', {
            pageTitle: "Advertiser Profile",
            userType: req.user.userType,
            username: req.user.name,
            email: req.user.email,
            errorMessage: '',
            phoneNumber: req.user.phoneNumber,
            companyAddress: req.user.companyAddress,
            sessionId: '',
            isBronzeAd: req.user.isBronzeAd,
            isSilverAd: req.user.isSilverAd,
            isGoldAd: req.user.isGoldAd,
            homeState: req.user.homeState,
            currentSeason: currentSeason
        })
    }
}

exports.postEditProfile = (req, res, next) => {
    const userId = req.user._id.toString()
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('home/profile', {
            pageTitle: "Underdog Profile",
            name: req.user.name,
            email: req.user.email,
            preferredGenre: req.user.preferredGenre,
            errorMessage: errors.array()[0].msg,
            instagram: req.user.instagram,
            tiktok: req.user.tiktok,
            bio: req.user.bio,
            userProfileImage: req.user.userProfileImage,
            userSongs: req.user.songs
        });
    }
    
    User.findById(userId)
        .then(user => {
            if (user._id.toString() !== req.user._id.toString()) {
                return res.redirect('/profile');
            }
            user.name = req.body.name;
            user.email = req.body.email;
            user.instagram = req.body.instagram;
            user.tiktok = req.body.tiktok;
            user.recordLabel = req.body.recordLabel
            user.phoneNumber = req.body.phoneNumber
            user.companyAddress = req.body.companyAddress
            user.preferredGenre = req.body.genre;
            user.bio = req.body.bio || req.user.bio;
            user.userProfileImage = req.file ? req.file.path : req.user.userProfileImage;

            return user.save()
                .then(result => {
                    console.log('UPDATED USER!');
                    res.redirect('/profile');
                });
        })
        .catch(err => {
            if (err){
                console.log(err)
            }
        });
  }

exports.getReleases = (req, res, next) => {
    Song.find({ season: currentSeason })
        .then(songs => {
            res.render('home/releases', {
                pageTitle: "Underdog Artists",
                songs: songs
            })
        })
}

exports.getLocalReleases = (req, res, next) => {
    let localSongsArr = []
    User.find({ homeState: req.user.homeState, userType: 'Contestant' })
        .then(localArtists => {
            localArtists.forEach(artist => {
                localSongsArr.push(artist.songs[0])
            })
            res.render('home/localreleases', {
                pageTitle: "Underdog Artists",
                localSongsArr: localSongsArr
            })
        })
}

exports.getRelease = (req, res, next) => {
    const artistName = req.params.artistName
    const songName = req.params.songName
    User.find({ name: artistName })
        .then(artist => {
            Song.find({ songTitle: songName })
                .then(song => {
                    if (song) {
                        res.render('home/release', {
                            pageTitle: "Underdog Release",
                            artist: artist[0],
                            youtubeSongId: song[0].youtubeSongId
                        })
                    }
                })
        })
}

exports.getSeasons = (req, res, next) => {
    res.render('home/seasons', {
        pageTitle: "Underdog Seasons"
    })
}

exports.getSeason = (req, res, next) => {
    const seasonNumber = req.params.seasonNumber
    User.find()
    .then(artists => {
        Song.find({ season: seasonNumber })
            .then(songs => {
                    let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    let topFiveSongs = topSongs.slice(0, 5)
                    res.render('home/season', {
                        pageTitle: 'UnderdogIdols Seasons',
                        topFiveSongs: topFiveSongs,
                        artists: artists,
                        seasonNumber: seasonNumber
                    })
                })
        })
}

exports.getNews = (req, res, next) => {
    res.render('home/news', {
        pageTitle: "Underdog News"
    })
}

exports.getVoting = (req, res, next) => {
    User.find()
        .then(artists => {
            Song.find({ season: currentSeason })
                .then(songs => {
                    let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    let topFiveSongs = topSongs.slice(0, 5)
                    res.render('home/voting', {
                        pageTitle: 'UnderdogIdols Voting',
                        songs: songs,
                        topFiveSongs: topFiveSongs,
                        artists: artists,
                        errorMessage: ''
                    })
            })
        })
}

exports.getSongForVoting = (req, res, next) => {
    const songName = req.params.songName
    const artistName = req.params.artistName
    User.find({ name: artistName })
        .then(artist => {
            Song.find({ songTitle: songName })
                .then(song => {
                    if (song) {
                        res.render('home/votesong', {
                            pageTitle: "Underdog Voting",
                            artist: artist[0],
                            song: song[0],
                            youtubeSongId: song[0].youtubeSongId
                        })
                    }
                })
        })
}

exports.postCastVote = (req, res, next) => {
    const songName = req.params.songName
    User.find({ email: req.session.passport.user[0].email})
        .then(user => {
            isExistingSong = user[0].songs.filter(userSongs => userSongs.songTitle === songName)
            votingUser = user[0]
            Song.find({ season: currentSeason })
                .then(songs => {
                    let sortedSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    const song = songs.filter(filteredSong => filteredSong.songTitle === songName)
                    if (isExistingSong.length === 0){
                        song[0].votes++
                        song[0].save()
                    } else {
                        song[0].save()
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        res.render('home/voting', {
                            pageTitle: 'UnderdogIdols Voting',
                            songs: songs,
                            topFiveSongs: topFiveSongs,
                            errorMessage: 'Can not vote multiple times for the same song.'
                        })
                        return
                    }
                    User.find({ name: song[0].artistName })
                        .then(user => {
                            let correctSong = user[0].songs.filter(votedSong => votedSong.songTitle === songName)
                            if (isExistingSong.length === 0){
                                correctSong[0].votes++
                                votingUser.addSong(correctSong[0])
                                user[0].save()
                                let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                                let topFiveSongs = topSongs.slice(0, 5)
                                res.render('home/voting', {
                                    pageTitle: 'UnderdogIdols Voting',
                                    songs: songs,
                                    topFiveSongs: topFiveSongs,
                                    errorMessage: ''
                                })
                            } else {
                                let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                                let topFiveSongs = topSongs.slice(0, 5)
                                res.render('home/voting', {
                                    pageTitle: 'UnderdogIdols Voting',
                                    songs: songs,
                                    topFiveSongs: topFiveSongs,
                                    errorMessage: ''
                                })
                            }
                        })
                })
        })
}

exports.postGetCheckout = async (req, res, next) => {
    let user = req.user
    let title = req.body.title
    let songUrl = req.body.songUrl
    let genre = req.body.genre
    let pmtOption = req.body.paymentOption
    let hasAlreadyUploaded = user.songs.filter(song => song.season === currentSeason)

    if (hasAlreadyUploaded.length > 0) {
        return res.status(422).render('home/profile', {
          pageTitle: "Underdog Profile",
          username: user.name,
          email: user.email,
          preferredGenre: user.preferredGenre,
          instagram: user.instagram,
          tiktok: user.tiktok,
          bio: user.bio,
          userProfileImage: user.userProfileImage,
          votes: user.votes,
          errorMessage: 'You can only add one song per season',
          userSongs: user.songs,
          isPremiumUser: req.user.isPremiumUser,
          currentSeason: currentSeason
        });
    } else {
        if (req.user.isPremiumUser) {
            res.redirect(`/checkout/success?&title=${title}&songUrl=${songUrl}&genre=${genre}`)
        } 
        else if (pmtOption === 'Single Upload'){
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                  {
                    price_data: {
                      currency: 'usd',
                      unit_amount: 10 * 100,
                      product_data: {
                        name: title,
                        description: `Submit song for Season ${currentSeason} competition`,
                      }
                    },
                    quantity: 1,
                  },
                ],
                mode: 'payment',
                success_url: req.protocol + '://' + req.get('host') + `/checkout/success?session_id={CHECKOUT_SESSION_ID}&title=${title}&songUrl=${songUrl}&genre=${genre}`,
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            })
            res.redirect(session.url)
        } else if (pmtOption === 'Subscription') {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                      price: 'price_1MGm29Bb37tvGgw4XKleG2W4',
                      quantity: 1,
                    },
                  ],
                mode: 'subscription',
                success_url: req.protocol + '://' + req.get('host') + `/checkout/success?session_id={CHECKOUT_SESSION_ID}&title=${title}&songUrl=${songUrl}&genre=${genre}&pmtOption=${pmtOption}`,
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            })
            res.redirect(session.url)
        }
        
    }
};

exports.postGetAdCheckout = async (req, res, next) => {
    let pmtOption = req.body.pmtOption
    if (pmtOption === 'Bronze') {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                  price: 'price_1MOak3Bb37tvGgw4rue7bp0L',
                  quantity: 1,
                },
              ],
            mode: 'subscription',
            success_url: req.protocol + '://' + req.get('host') + `/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })
        res.redirect(session.url)
    }
    if (pmtOption === 'Silver') {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                  price: 'price_1MOaj5Bb37tvGgw4eTYSgGKa',
                  quantity: 1,
                },
              ],
            mode: 'subscription',
            success_url: req.protocol + '://' + req.get('host') + `/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })
        res.redirect(session.url)
    }
    if (pmtOption === 'Gold') {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                  price: 'price_1MOagyBb37tvGgw48vIPWxVz',
                  quantity: 1,
                },
              ],
            mode: 'subscription',
            success_url: req.protocol + '://' + req.get('host') + `/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
        })
        res.redirect(session.url)
    }
}
  
exports.getCheckoutSuccess = (req, res, next) => {
    let user = req.user
    let title = req.query.title
    let youtubeSongUrl = req.query.songUrl
    let genre = req.query.genre
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log(errors.array());
      return res.status(422).render('home/profile', {
        pageTitle: "Underdog Profile",
        username: user.name,
        email: user.email,
        preferredGenre: user.preferredGenre,
        instagram: user.instagram,
        tiktok: user.tiktok,
        bio: user.bio,
        userProfileImage: user.userProfileImage,
        votes: user.votes,
        errorMessage: errors.array()[0].msg,
        userSongs: user.songs,
        currentSeason: currentSeason
      });
    }

    if (youtubeSongUrl) {
        let youtubeSongUrlArr = youtubeSongUrl.split('/')
        let youtubeSongId = youtubeSongUrlArr[youtubeSongUrlArr.length - 1]
        const newSong = new Song({
            songTitle: title,
            youtubeSongId: youtubeSongId,
            songGenre: genre,
            season: user.isPremiumUser ? currentSeason : currentSeason,
            votes: 0,
            dateCreated: new Date(),
            artistName: user.name,
        });
        newSong
        .save()
        .then(result => {
            // console.log(result);
            user.addSong(newSong)
            console.log('Created Song');
            res.redirect('/profile');
        })
        .catch(err => {
            if (err) {
            console.log(err)
            }
        });
    } else {
        user.save()
        res.redirect('/profile');
    }
};

exports.createAdvertisement = (req, res, next) => {
    const adTitle = req.body.adTitle
    const adDescription = req.body.adDescription
    const affiliateLink = req.body.affiliateLink
    const isBronzeAd = Boolean(req.body.isBronzeAd)
    const isSilverAd = Boolean(req.body.isSilverAd)
    const isGoldAd = Boolean(req.body.isGoldAd)
    const homeState = req.body.homeState

    if (req.user.songs.length > 0) {
        res.render('home/advertiserprofile', {
            pageTitle: "Advertiser Profile",
            userType: req.user.userType,
            username: req.user.name,
            email: req.user.email,
            errorMessage: 'You can only create one advertisement.',
            phoneNumber: req.user.phoneNumber,
            companyAddress: req.user.companyAddress,
            sessionId: '',
            isBronzeAd: req.user.isBronzeAd,
            isSilverAd: req.user.isSilverAd,
            isGoldAd: req.user.isGoldAd,
            homeState: req.user.homeState,
            currentSeason: currentSeason
        })
    }

    if (isBronzeAd){
        const ad = new Ad({
            adLogo: req.file ? req.file.path : 'img/home/slide1.jpg',
            adTitle: adTitle,
            adAffiliateLink: affiliateLink,
        })
        ad.save()
        req.user.songs.push(
            {
                adTitle: adTitle,
                adAffiliateLink: affiliateLink
            }
        )
        req.user.save()
        res.redirect('/profile')
    } else {
        const ad = new Ad({
            adTitle: adTitle,
            adDescription: adDescription,
            adAffiliateLink: affiliateLink,
            adBackground: req.file ? req.file.path : 'img/home/slide1.jpg',
            isBronzeAd: isBronzeAd,
            isSilverAd: isSilverAd,
            isGoldAd: isGoldAd,
            adHomeState: homeState
        })
        ad.save()
        req.user.songs.push(
            {
                adTitle: adTitle,
                adDescription: adDescription,
                adAffiliateLink: affiliateLink,
                adBackground: req.file ? req.file.path : 'img/home/slide1.jpg'
            }
        )
        req.user.save()
        res.redirect('/profile')
    }
}

exports.getAbout = (req, res, next) => {
    res.render('home/about', {
        pageTitle: "About UnderdogIdols"
    })
}

exports.getPricing = (req, res, next) => {
    res.render('home/pricing', {
        pageTitle: "Underdog Pricing"
    })
}

exports.getPrivacy = (req, res, next) => {
    res.render('home/privacy', {
        pageTitle: "Privacy Policy"
    })
}