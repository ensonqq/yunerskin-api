const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const scheme = mongoose.Schema({
    name  : {
      type    : String,
      require : true
    },
    value : {
      type    : mongoose.Schema.Types.Mixed,
      required : true
    },

  }, {
    timestamps : true,
  }
);

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef Holiday
 */
const Holiday = mongoose.model('Holiday', scheme);

module.exports = Holiday;
