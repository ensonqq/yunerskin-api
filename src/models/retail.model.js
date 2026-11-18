const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const { locations } = require("../config/locations");

const scheme = mongoose.Schema({
    name : {
      zh : {
        type    : String,
        require : true
      },
      en : {
        type    : String,
        require : true
      }
    },

    phone       : {
      type    : String,
      require : true
    },
    fullAddress : {
      type    : String,
      require : true
    },
    area        : { type : String, required : true, enum : Object.keys(locations) },//hk, kln, nt
    images      : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],
    published   : { type : Boolean, default : false }
  }, {
    timestamps : true,
  }
);

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef Retail
 */
const Retail = mongoose.model('Retail', scheme);

module.exports = Retail;
