const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const songSchema = new Schema({
  songTitle: {
    type: String,
    index: true,
    required: true
  },
  youtubeSongId: {
    type: String,
    index: true,
    required: true
  },
  songGenre: {
    type: String,
    index: true,
    required: true
  },
  season: {
    type: Number,
    index: true,
    required: true
  },
  votes: {
    type: Number,
    index: true,
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