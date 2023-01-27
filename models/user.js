const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    index: true
  },
  email: {
    type: String,
    index: true
  },
  password: {
    type: String
  },
  userType: {
    type: String,
    index: true
  },
  homeState: {
    type: String,
    index: true
  },
  userProfileImage: {
    type: String
  },
  preferredGenre: {
    type: String,
    index: true
  },
  instagram: {
    type: String
  },
  tiktok: {
    type: String
  },
  bio: {
    type: String
  },
  recordLabel: {
    type: String
  },
  companyAddress: {
    type: String
  },
  companyName: {
    type: String
  },
  phoneNumber: {
    type: Number
  },
  companyURL: {
    type: String
  },
  isPremiumUser: {
    type: Boolean
  },
  isBronzeAd: {
    type: Boolean
  },
  isSilverAd: {
    type: Boolean
  },
  isGoldAd: {
    type: Boolean
  },
  contactsAvailable: {
    type: Number
  },
  fanLoggedIn: {
    type: Boolean
  },
  resetToken: {
    type: String,
    index: true
  },
  resetTokenExpiration: {
    type: Date,
    index: true
  },
  songs: [
    {
      songTitle: {
        type: String,
        ref: 'Songs'
      },
      songGenre: {
        type: String
      },
      season: {
        type: Number
      },
      youtubeSongId: {
        type: String
      },
      votes: {
        type: Number
      },
      dateCreated: {
        type: Date
      },
      artistName: {
        type: String
      },
      adTitle: {
        type: String
      },
      adDescription: {
        type: String
      },
      adAffiliateLink: {
        type: String
      },
      adBackground: {
        type: String
      }
    }
  ]
});

userSchema.methods.addSong = function(song) {
  const currentUserSongArr = this.songs
  const isDuplicateVote = currentUserSongArr.find(userSong => {
    return userSong.songTitle === song.songTitle
  })
  if (isDuplicateVote) {
    return this.save()
  } else {

    const updatedSongs = [...this.songs];

    updatedSongs.push({
      songTitle: song.songTitle,
      youtubeSongId: song.youtubeSongId,
      songGenre: song.songGenre,
      votes: song.votes,
      season: song.season,
      artistName: song.artistName,
      dateCreated: new Date(),
    });

    this.songs = updatedSongs;
    return this.save();
  }
};

// userSchema.methods.removeFromCart = function(productId) {
//   const updatedCartItems = this.cart.items.filter(item => {
//     return item.productId.toString() !== productId.toString();
//   });
//   this.cart.items = updatedCartItems;
//   return this.save();
// };

// userSchema.methods.clearCart = function() {
//   this.cart = { items: [] };
//   return this.save();
// };

module.exports = mongoose.model('User', userSchema)