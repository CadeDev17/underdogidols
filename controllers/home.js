require('dotenv').config()
const User = require('../models/user')
const Song = require('../models/song')
const Ad = require('../models/ad')

const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const currentSeason = 2
const nextSeason = currentSeason + 1
const previousSeason = currentSeason - 1

const ITEMS_PER_PAGE = 10

const transporter = nodemailer.createTransport(
    sendgridTransport({
      auth: {
        api_key:
            process.env.NODEMAILER_API_KEY
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
                            artists: artists,
                            ads: ''
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
    const page = +req.query.page || 1;
    let totalArtists;

    User.find({ userType: 'Contestant' })
        .countDocuments()
        .then(numArtists => {
            totalArtists = numArtists;
            return User.find({ userType: 'Contestant' })
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
        })
        .then(artists => {
            Ad.find()
                .then(ads => {
                    res.render('home/artists', {
                        pageTitle: "Underdog Artists",
                        selectedByGenre: false,
                        genreSelected: '',
                        artists: artists,
                        ads: ads,
                        currentPage: page,
                        hasNextPage: ITEMS_PER_PAGE * page < totalArtists,
                        hasPreviousPage: page > 1,
                        nextPage: page + 1,
                        previousPage: page - 1,
                        lastPage: Math.ceil(totalArtists / ITEMS_PER_PAGE)
                    })
                })
        })
}

exports.postGetArtistsByName = (req, res, next) => {
    const searchedContestant = req.body.searchedContestant
    const page = +req.query.page || 1;
    let totalArtists;
    if (searchedContestant !== undefined) {
        User.find({ userType: 'Contestant', name: searchedContestant})
            .then(artists => {
                Ad.find()
                    .then(ads => {
                        res.render('home/artists', {
                            pageTitle: "Underdog Performances",
                            selectedByGenre: true,
                            genreSelected: '',
                            artists: artists,
                            ads: ads,
                            currentSeason: currentSeason
                        })
                    })
            })
    } else {
        User.find({ userType: 'Contestant' })
            .countDocuments()
            .then(numArtists => {
                totalArtists = numArtists;
                return User.find({ userType: 'Contestant' })
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
            })
            .then(artists => {
                Ad.find()
                    .then(ads => {
                        res.render('home/artists', {
                            pageTitle: "Underdog Artists",
                            selectedByGenre: false,
                            genreSelected: '',
                            artists: artists,
                            ads: ads,
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PAGE * page < totalArtists,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalArtists / ITEMS_PER_PAGE)
                        })
                    })
            })
    }
}

exports.postGetArtistsByGenre = (req, res, next) => {
    const selectedGenre = req.body.genre
    const page = +req.query.page || 1;
    let totalSongs;
    if (selectedGenre !== 'All genres') {
        User.find({ userType: 'Contestant', preferredGenre: selectedGenre })
            .then(allArtists => {
                Ad.find()
                    .then(ads => {
                        res.render('home/artists', {
                            pageTitle: "Underdog Performances",
                            selectedByGenre: true,
                            genreSelected: selectedGenre,
                            artists: allArtists,
                            ads: ads,
                            currentSeason: currentSeason,
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                        })
                    })
            })
    } else {
        User.find({ userType: 'Contestant' })
        .countDocuments()
        .then(numArtists => {
            totalArtists = numArtists;
            return User.find({ userType: 'Contestant' })
            .skip((page - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
        })
        .then(artists => {
            Ad.find()
                .then(ads => {
                    res.render('home/artists', {
                        pageTitle: "Underdog Artists",
                        selectedByGenre: false,
                        genreSelected: '',
                        artists: artists,
                        ads: ads,
                        currentPage: page,
                        hasNextPage: ITEMS_PER_PAGE * page < totalArtists,
                        hasPreviousPage: page > 1,
                        nextPage: page + 1,
                        previousPage: page - 1,
                        lastPage: Math.ceil(totalArtists / ITEMS_PER_PAGE)
                    })
                })
        })
    }
}

exports.getLocalArtists = (req, res, next) => {
    User.find({ homeState: req.user.homeState })
        .then(artists => {
            Ad.find()
                .then(ads => {
                    res.render('home/localartists', {
                        pageTitle: "Underdog Artists",
                        artists: artists,
                        ads: ads
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
                            advertiserContactsAvailable: advertiser.contactsAvailable,
                            ads: ''
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
                    advertiserContactsAvailable: 20,
                    ads: ''
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
            }
            res.render('home/artist', {
                pageTitle: "Underdog Artist",
                artist: artist[0],
                errorMessage: '',
                userType: req.user.userType,
                advertiserContactsAvailable: 20,
                successMessage: 'Your message has been sent. Responses will be sent to your accounts email.',
                ads: ''
            })
            transporter.sendMail({
                to: 'decryptr22@gmail.com',
                from: 'supprtunderdogidols@gmail.com',
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
            errorMessage: '',
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
                    errorMessage: '',
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
    const selectedGenre = req.query.genre
    const page = +req.query.page || 1;
    let totalSongs;
    Song.find({ season: currentSeason })
        .then(allSongs => {
            Song.find({ season: currentSeason })
                .countDocuments()
                .then(numSongs => {
                    totalSongs = numSongs;
                    return Song.find({ season: currentSeason })
                    .skip((page - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
                })
                .then(songs => {
                    let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    let topFiveSongs = topSongs.slice(0, 5)
                    Ad.find()
                        .then(ads => {
                            res.render('home/releases', {
                                pageTitle: "Underdog Performances",
                                selectedByGenre: false,
                                songs: songs,
                                ads: ads,
                                currentSeason: currentSeason,
                                topFiveSongs: topFiveSongs,
                                currentPage: page,
                                hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                hasPreviousPage: page > 1,
                                nextPage: page + 1,
                                previousPage: page - 1,
                                lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                            })
                        })
                })
        })
}

exports.postGetReleasesByGenre = (req, res, next) => {
    const selectedGenre = req.body.genre
    const page = +req.query.page || 1;
    let totalSongs;
    if (selectedGenre !== 'All genres') {
        Song.find({ season: currentSeason, songGenre: selectedGenre })
            .then(allSongs => {
                let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                let topFiveSongs = topSongs.slice(0, 5)
                Ad.find()
                    .then(ads => {
                        res.render('home/releases', {
                            pageTitle: "Underdog Performances",
                            selectedByGenre: true,
                            genreSelected: selectedGenre,
                            songs: allSongs,
                            ads: ads,
                            currentSeason: currentSeason,
                            topFiveSongs: topFiveSongs,
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                        })
                    })
            })
    } else {
        Song.find({ season: currentSeason })
            .then(allSongs => {
                Song.find({ season: currentSeason })
                    .countDocuments()
                    .then(numSongs => {
                        totalSongs = numSongs;
                        return Song.find({ season: currentSeason })
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE);
                    })
                    .then(songs => {
                        let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/releases', {
                                    pageTitle: "Underdog Performances",
                                    selectedByGenre: false,
                                    songs: songs,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    }
}

exports.postGetReleasesBySongName = (req, res, next) => {
    const searchedSong = req.body.searchedSong
    const page = +req.query.page || 1;
    let totalSongs;
    if (searchedSong !== undefined) {
        Song.find()
            .then(songs => {
                Song.find({ season: currentSeason, songTitle: searchedSong })
                    .then(selectedSong => {
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/releases', {
                                    pageTitle: "Underdog Performances",
                                    selectedByGenre: true,
                                    genreSelected: '',
                                    songs: selectedSong,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    } else {
        Song.find({ season: currentSeason })
            .then(allSongs => {
                Song.find({ season: currentSeason })
                    .countDocuments()
                    .then(numSongs => {
                        totalSongs = numSongs;
                        return Song.find({ season: currentSeason })
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE);
                    })
                    .then(songs => {
                        let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/releases', {
                                    pageTitle: "Underdog Performances",
                                    selectedByGenre: false,
                                    songs: songs,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    }
}

exports.getLocalReleases = (req, res, next) => {
    let localSongsArr = []
    User.find({ homeState: req.user.homeState, userType: 'Contestant' })
        .then(localArtists => {
            localArtists.forEach(artist => {
                if (artist.songs.length > 0) {
                    localSongsArr.push(artist.songs[0])
                }
            })
            res.render('home/localreleases', {
                pageTitle: "Underdog Artists",
                localSongsArr: localSongsArr,
                ads: ''
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
                            youtubeSongId: song[0].youtubeSongId,
                            ads: ''
                        })
                    }
                })
        })
}

exports.getSeasons = (req, res, next) => {
    res.render('home/seasons', {
        pageTitle: "Underdog Seasons",
         ads: ''
    })
}

exports.getSeason = (req, res, next) => {
    const seasonNumber = req.params.seasonNumber
    User.find()
    .then(artists => {
        Song.find({ season: seasonNumber })
            .then(songs => {
                    let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    let topFiveSongs = topSongs.slice(0, 6)
                    res.render('home/season', {
                        pageTitle: 'UnderdogIdols Seasons',
                        topFiveSongs: topFiveSongs,
                        artists: artists,
                        seasonNumber: seasonNumber,
                        ads: ''
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
    const page = +req.query.page || 1;
    let totalSongs;

    let userVotedSongTitles = []
    req.session.passport.user[0].songs.forEach(userVotedSong => {
        userVotedSongTitles.push(userVotedSong.songTitle)
    })

    User.find()
        .then(artists => {
            Song.find({ season: currentSeason })
                .countDocuments()
                .then(numSongs => {
                    totalSongs = numSongs;
                    return Song.find({ season: currentSeason })
                    .skip((page - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
                })
                .then(songs => {
                    let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                    let topFiveSongs = topSongs.slice(0, 5)
                    Ad.find()
                        .then(ads => {
                            res.render('home/voting', {
                                pageTitle: 'UnderdogIdols Voting',
                                songs: songs,
                                selectedByGenre: false,
                                genreSelected: '',
                                currentSeason: 2,
                                topFiveSongs: topFiveSongs,
                                userVotedSongTitles: userVotedSongTitles,
                                artists: artists,
                                errorMessage: '',
                                ads: ads,
                                currentPage: page,
                                hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                hasPreviousPage: page > 1,
                                nextPage: page + 1,
                                previousPage: page - 1,
                                lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                            })
                        })
            })
        })
}

exports.postGetVotableByGenre = (req, res, next) => {
    let userVotedSongTitles = []
    req.session.passport.user[0].songs.forEach(userVotedSong => {
        userVotedSongTitles.push(userVotedSong.songTitle)
    })

    const selectedGenre = req.body.genre
    const page = +req.query.page || 1;
    let totalSongs;
    
    if (selectedGenre !== 'All genres') {
        Song.find({ season: currentSeason, songGenre: selectedGenre })
            .then(allSongs => {
                let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                let topFiveSongs = topSongs.slice(0, 5)
                Ad.find()
                    .then(ads => {
                        res.render('home/voting', {
                            pageTitle: "Underdog Performances",
                            errorMessage: '',
                            selectedByGenre: true,
                            genreSelected: selectedGenre,
                            songs: allSongs,
                            ads: ads,
                            currentSeason: currentSeason,
                            topFiveSongs: topFiveSongs,
                            userVotedSongTitles: userVotedSongTitles,
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                        })
                    })
            })
    } else {
        Song.find({ season: currentSeason })
            .then(allSongs => {
                Song.find({ season: currentSeason })
                    .countDocuments()
                    .then(numSongs => {
                        totalSongs = numSongs;
                        return Song.find({ season: currentSeason })
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE);
                    })
                    .then(songs => {
                        let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/voting', {
                                    pageTitle: "Underdog Performances",
                                    errorMessage: '',
                                    selectedByGenre: false,
                                    genreSelected: '',
                                    songs: songs,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    userVotedSongTitles: userVotedSongTitles,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    }
}

exports.postGetVotableBySongName = (req, res, next) => {
    let userVotedSongTitles = []
    req.session.passport.user[0].songs.forEach(userVotedSong => {
        userVotedSongTitles.push(userVotedSong.songTitle)
    })

    const searchedSong = req.body.searchedSong
    const page = +req.query.page || 1;
    let totalSongs;
    if (searchedSong !== undefined) {
        Song.find()
            .then(songs => {
                Song.find({ season: currentSeason, songTitle: searchedSong })
                    .then(selectedSong => {
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/voting', {
                                    pageTitle: "Underdog Performances",
                                    errorMessage: '',
                                    selectedByGenre: true,
                                    genreSelected: '',
                                    songs: selectedSong,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    userVotedSongTitles: userVotedSongTitles,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    } else {
        Song.find({ season: currentSeason })
            .then(allSongs => {
                Song.find({ season: currentSeason })
                    .countDocuments()
                    .then(numSongs => {
                        totalSongs = numSongs;
                        return Song.find({ season: currentSeason })
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE);
                    })
                    .then(songs => {
                        let topSongs = allSongs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        Ad.find()
                            .then(ads => {
                                res.render('home/voting', {
                                    pageTitle: "Underdog Performances",
                                    errorMessage: '',
                                    selectedByGenre: false,
                                    genreSelected: '',
                                    songs: songs,
                                    ads: ads,
                                    currentSeason: currentSeason,
                                    topFiveSongs: topFiveSongs,
                                    userVotedSongTitles: userVotedSongTitles,
                                    currentPage: page,
                                    hasNextPage: ITEMS_PER_PAGE * page < totalSongs,
                                    hasPreviousPage: page > 1,
                                    nextPage: page + 1,
                                    previousPage: page - 1,
                                    lastPage: Math.ceil(totalSongs / ITEMS_PER_PAGE)
                                })
                            })
                    })
            })
    }
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
                            youtubeSongId: song[0].youtubeSongId,
                            selectedByGenre: false,
                            ads: ''
                        })
                    }
                })
        })
}

exports.postCastVote = (req, res, next) => {
    const songName = req.params.songName
    // Getting the songs that the request session user had previously voted for
    let userVotedSongTitles = []
    req.session.passport.user[0].songs.forEach(userVotedSong => {
        userVotedSongTitles.push(userVotedSong.songTitle)
    })
    // Finding request session user by email in user DB
    User.find({ email: req.session.passport.user[0].email})
        .then(user => {
            votingUser = user[0]
            Song.find({ season: currentSeason })
                .then(songs => {
                    // Finding the voted for song in the song DB
                    const song = songs.filter(filteredSong => filteredSong.songTitle === songName)
                    // This answers if this song already been voted for by this user
                    isExistingSong = user[0].songs.filter(userSongs => userSongs.songTitle === songName)
                    // If it has NOT been previously voted on by this user, add a vote and save
                    if (isExistingSong.length === 0){
                        song[0].votes++
                        song[0].save()
                        req.session.passport.user[0].songs.push(song[0])
                        userVotedSongTitles.push(song[0].songTitle)
                    } else {
                        // If the song HAS been voted on previously, save the song and re-render voting page w/ error msg
                        song[0].save()
                        let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                        let topFiveSongs = topSongs.slice(0, 5)
                        res.render('home/voting', {
                            pageTitle: 'UnderdogIdols Voting',
                            selectedByGenre: true,
                            genreSelected: '',
                            songs: songs,
                            topFiveSongs: topFiveSongs,
                            userVotedSongTitles: userVotedSongTitles,
                            errorMessage: 'Can not vote multiple times for the same song.',
                            ads: ''
                        })
                        return
                    }
                    // The song object also holds vote count, here we are adding the vote there as well
                    // Finding the user by the artist name of the song that is being voted on
                    User.find({ name: song[0].artistName })
                        .then(user => {
                            // Finding the correct song (because users can have multiple songs)
                            let correctSong = user[0].songs.filter(votedSong => votedSong.songTitle === songName)
                            // If song has NOT been voted on by the fan previously, then add a vote and save the song
                            if (isExistingSong.length === 0){
                                correctSong[0].votes++
                                votingUser.addSong(correctSong[0])
                                user[0].save()
                                let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                                let topFiveSongs = topSongs.slice(0, 5)
                                res.render('home/voting', {
                                    pageTitle: 'UnderdogIdols Voting',
                                    selectedByGenre: true,
                                    genreSelected: '',
                                    songs: songs,
                                    topFiveSongs: topFiveSongs,
                                    userVotedSongTitles: userVotedSongTitles,
                                    errorMessage: '',
                                    ads: ''
                                })
                            } else {
                                // If the song HAS been voted on previously, then just re-render the voting page
                                let topSongs = songs.sort((song1, song2) => (song1.votes < song2.votes) ? 1 : (song1.votes > song2.votes) ? -1 : 0);
                                let topFiveSongs = topSongs.slice(0, 5)
                                res.render('home/voting', {
                                    pageTitle: 'UnderdogIdols Voting',
                                    selectedByGenre: true,
                                    genreSelected: '',
                                    songs: songs,
                                    topFiveSongs: topFiveSongs,
                                    userVotedSongTitles: userVotedSongTitles,
                                    errorMessage: '',
                                    ads: ''
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
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return Ad.find({ isGoldAd: true })
                .then(goldAds => {
                    Ad.find({ isGoldAd: true, adHomeState: req.user.homeState })
                        .then(goldAdsByState => {
                            res.status(422).render('home/profile', {
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
                            successMessage: '',
                            userSongs: user.songs,
                            currentSeason: currentSeason,
                            goldAds: user.userType === "Contestant" ? goldAds : '',
                            goldAdsByState: user.userType === "Contestant" ? goldAdsByState : '',
                            isPremiumUser: req.user.isPremiumUser,
                            ads: ''
                            })
                        });
                })
    } else if (hasAlreadyUploaded.length > 0) {
        return Ad.find({ isGoldAd: true, adHomeState: req.user.homeState })
            .then(goldAds => {
                res.status(422).render('home/profile', {
                pageTitle: "Underdog Profile",
                username: user.name,
                email: user.email,
                preferredGenre: user.preferredGenre,
                instagram: user.instagram,
                tiktok: user.tiktok,
                bio: user.bio,
                userProfileImage: user.userProfileImage,
                votes: user.votes,
                errorMessage: 'Can only upload one song per season.',
                successMessage: '',
                userSongs: user.songs,
                currentSeason: currentSeason,
                goldAds: user.userType === "Contestant" ? goldAds : '',
                isPremiumUser: req.user.isPremiumUser,
                ads: ''
                })
            })
    } else {
        if (req.user.isPremiumUser) {
            res.redirect(`/checkout/success?&title=${title}&songUrl=${songUrl}&genre=${genre}`)
        } else if (pmtOption === 'Single Upload') {
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
                      price: 'price_1Hz3p1GUljPyCRPOZyhxhSsv',
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
                  price: 'price_1MRfYIGUljPyCRPOib7Ti5eB',
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
                  price: 'price_1MRfZwGUljPyCRPOotPqUOsL',
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
                  price: 'price_1MRfbNGUljPyCRPOWvMBr2vf',
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


    if (youtubeSongUrl) {
        let youtubeSongId
        if (youtubeSongUrl.includes('https://youtu.be/')) {
            let youtubeSongUrlArr = youtubeSongUrl.split('/')
            youtubeSongId = youtubeSongUrlArr[youtubeSongUrlArr.length - 1]
        } else if (youtubeSongUrl.includes('https://www.youtube.com/watch?v=')) {
            let youtubeSongUrlArr = youtubeSongUrl.split('v=')
            youtubeSongId = youtubeSongUrlArr[youtubeSongUrlArr.length - 1]
        }
        if (youtubeSongId) {
            const newSong = new Song({
                songTitle: title,
                youtubeSongId: youtubeSongId,
                songGenre: genre,
                season: user.isPremiumUser ? currentSeason : nextSeason,
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
    } else {
        user.save()
        res.redirect('/profile')
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
    console.log(req.user.songs.length)
    if (req.user.songs.length > 0) {
        Ad.find()
            .then(allAds => {
                res.render('home/advertiserprofile', {
                    pageTitle: "Advertiser Profile",
                    userType: req.user.userType,
                    username: req.user.name,
                    email: req.user.email,
                    errorMessage: 'You can only create one advertisement.',
                    phoneNumber: req.user.phoneNumber,
                    companyAddress: req.user.companyAddress,
                    sessionId: '',
                    allAds: allAds,
                    isBronzeAd: req.user.isBronzeAd,
                    isSilverAd: req.user.isSilverAd,
                    isGoldAd: req.user.isGoldAd,
                    homeState: req.user.homeState,
                    currentSeason: currentSeason
                })
                return
            })
    } else if (isBronzeAd) {
        const ad = new Ad({
            adLogo: req.file ? req.file.path : 'images/logo.png',
            adTitle: adTitle,
            adAffiliateLink: affiliateLink,
            isBronzeAd: isBronzeAd,
            isSilverAd: isSilverAd,
            isGoldAd: isGoldAd,
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
            adBackground: req.file ? req.file.path : 'images/logo.png',
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
                adBackground: req.file ? req.file.path : 'images/logo.png'
            }
        )
        req.user.save()
        res.redirect('/profile')
    }
}

exports.getAbout = (req, res, next) => {
    res.render('home/about', {
        pageTitle: "About UnderdogIdols",
         ads: ''
    })
}

exports.getPricing = (req, res, next) => {
    res.render('home/pricing', {
        pageTitle: "Underdog Pricing",
        ads: ''
    })
}
exports.getHelpTicket = (req, res, next) => {
    res.render('home/help-ticket', {
        pageTitle: "Underdog Pricing",
        ads: '',
        errorMessage: '',
        successMessage: ''
    })
}

exports.postHelpTicket = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('home/help-ticket', {
            pageTitle: 'Underdog Help-Ticket',
            ads: '',
            errorMessage: errors.array()[0].msg,
            successMessage: ''
        });
    }


    res.render('home/help-ticket', {
        pageTitle: "Underdog Help-Ticket",
        ads: '',
        errorMessage: '',
        successMessage: 'Ticket submitted! We will reach out to you shortly.'
    })
    transporter.sendMail({
        to: 'decryptr22@gmail.com',
        from: 'supprtunderdogidols@gmail.com',
        subject: 'Record Label Message',
        html: `
          <p>${req.body.email} - ${req.body.issue}</p>
        `
      });
}

exports.getPrivacy = (req, res, next) => {
    res.render('home/privacy', {
        pageTitle: "Privacy Policy",
        ads: '',
        errorMessage: ''
    })
}