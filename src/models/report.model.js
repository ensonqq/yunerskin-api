const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const schema = mongoose.Schema(
  {
    name  : {
      // daily, monthly
      type     : String,
      required : true,
      trim     : true,
    },
    metas : {
      // dynamic objects, requirement not yet confirmed.
      type     : Object,
      required : true
    },
  },
  {
    timestamps : true,
  }
);

// add plugin that converts mongoose to json
schema.plugin(toJSON);
schema.plugin(paginate);
/**
 * @typedef Report
 */
const Report = mongoose.model('Report', schema);

module.exports = Report;
