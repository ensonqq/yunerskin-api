const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const scheme = mongoose.Schema(
  {
    images        : [{
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'Image',
      default : []
    }],
    name          : {
      zh : {
        type     : String,
        required : true,
      },
      en : {
        type     : String,
        required : true,
      }
    },
    slug          : {
      type   : String,
      unique : true,
      sparse : true,
    },
    group         : {
      type    : mongoose.Schema.Types.ObjectId,
      ref     : 'CategoryGroup',
      default : null,
    },
    sortOrder     : {
      type    : Number,
      default : 0,
    },
    slogan        : {
      zh : {
        type    : String,
        default : '無抗生素，不含味精，不含防腐，每日新鮮香港制造。',
      },
      en : {
        type    : String,
        default : 'No antibiotics, no MSG, no preservatives, fresh daily made in Hong Kong.'
      },
    },
    publish       : {
      type    : Boolean,
      default : true
    },

    buyXGetYFree : [{
      type    : mongoose.Schema({
        x : Number,
        y : Number,
      }),
      default : []
    }],

    //enable / disable buy x get y free
    buyXGetYFreeEnabled : {
      type    : Boolean,
      default : false
    },
  },
  {
    timestamps : true,
  }
);

/**
 * Virtual
 */
scheme.virtual('products', {
  ref          : 'Product',
  localField   : '_id',
  foreignField : 'category',
})

scheme.set('toObject', { virtuals : true });
scheme.set('toJSON', { virtuals : true });


// add plugin that converts mongoose to json
scheme.plugin(toJSON);
scheme.plugin(paginate);

/**
 * @typedef Category
 */
const Category = mongoose.model('Category', scheme);

module.exports = Category;
