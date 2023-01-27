const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const adSchema = new Schema({
  adLogo: {
    type:String
  },
  adTitle: {
    type: String,
    index: true
  },
  adDescription: {
    type: String
  },
  adAffiliateLink: {
    type: String,
    required: true
  },
  adBackground: {
    type: String
  },
  isBronzeAd: {
    type: Boolean
  },
  isSilverAd: {
    type: Boolean
  },
  isGoldAd: {
    type: Boolean,
    index: true
  },
  adHomeState: {
    type: String,
    index: true
  }
});

module.exports = mongoose.model('Ad', adSchema);