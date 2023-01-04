const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const adSchema = new Schema({
  adLogo: {
    type:String
  },
  adTitle: {
    type: String
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
    type: Boolean
  },
  adHomeState: {
    type: String
  }
});

module.exports = mongoose.model('Ad', adSchema);