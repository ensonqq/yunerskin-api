const mongoose = require('mongoose');
const { toJSON, paginate } = require("./plugins");

const imageSchema = mongoose.Schema(
  {
    large     : {
      filename : { type : String },
      path     : { type : String }
    },
    medium    : {
      filename : { type : String },
      path     : { type : String }
    },
    small     : {
      filename : { type : String },
      path     : { type : String }
    },
    createdBy : { type : mongoose.Schema.Types.ObjectId, ref : 'User', default : null }
  },
  { timestamps : true, }
);

// add plugin that converts mongoose to json
imageSchema.plugin(toJSON);
imageSchema.plugin(paginate);

module.exports = mongoose.model('Image', imageSchema);
