const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const scheme = mongoose.Schema(
  {
    name : {
      zh : {
        type     : String,
        required : true,
      },
      en : {
        type     : String,
        required : true,
      }
    },
    publish : {
      type    : Boolean,
      default : true,
    },
  },
  {
    timestamps : true,
  }
);

/**
 * Virtual — all categories that belong to this group, sorted by sortOrder
 */
scheme.virtual('categories', {
  ref          : 'Category',
  localField   : '_id',
  foreignField : 'group',
  options      : { sort : { sortOrder : 1 } },
});

scheme.set('toObject', { virtuals : true });
scheme.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef CategoryGroup
 */
const CategoryGroup = mongoose.model('CategoryGroup', scheme);

module.exports = CategoryGroup;
