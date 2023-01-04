const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const songSchema = new Schema({
  songTitle: {
    type: String,
    required: true
  },
  youtubeSongId: {
    type: String,
    required: true
  },
  songGenre: {
    type: String,
    required: true
  },
  season: {
    type: Number,
    required: true
  },
  votes: {
    type: Number,
    required: true
  },
  artistName: {
    type: String,
    ref: 'User',
    required: true
  }
});

songSchema.methods.editSong = function(song) {
  const userProfileImage = req.file
}

module.exports = mongoose.model('Song', songSchema);