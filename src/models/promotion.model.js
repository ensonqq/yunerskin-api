const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const scheme = mongoose.Schema({
    name : {
      type    : String,
      require : true
    },
    // banners for student/main/all sites
    // yunerksin.com.hk -> main
    // student.yunerksin.com.hk -> student
    url     : {
      type    : String,
      default : ''
    },
    type    : {
      type     : String,
      enum     : ['student', 'main', 'all'],
      required : true,
    },
    images  : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],
    publish : { type : Boolean, default : false }
  }, {
    timestamps : true,
  }
);

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef Promotion
 */
const Promotion = mongoose.model('Promotion', scheme);

module.exports = Promotion;
