const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');
const _ = require('underscore')
const { locations } = require('../config/locations')
const userSchema = mongoose.Schema(
  {
    name    : {
      type     : String,
      required : true,
      trim     : true,
    },
    vipTier : {
      type    : String,
      enum    : ['normal', 'gold', 'diamond'], // currently only 1: normal, 2: gold (sku price -$1), 3: diamond (credits x 3)
      default : 'normal'
    },
    email   : {
      type      : String,
      required  : true,
      unique    : true,
      trim      : true,
      lowercase : true,
      validate (value) {
        if (!validator.isEmail(value)) {
          throw new Error('電郵地址不正確');
        }
      },
    },

    // isStudent       : { type : Boolean, default : false, },
    // studentEnd      : { type : Date, required : true, },
    // studentIdentity : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : [] }],

    password        : {
      type      : String,
      required  : true,
      trim      : true,
      minlength : 8,
      private   : true, // used by the toJSON plugin
    },
    role            : {
      type    : String,
      enum    : roles,
      default : 'user',
    },
    isKol           : {
      type    : Boolean,
      default : false,
    },
    gender          : {
      type     : String,
      enum     : ['m', 'f'],
      required : true,
    },
    isEmailVerified : {
      type    : Boolean,
      default : false,
    },
    status          : {
      type    : String,
      enum    : ['active', 'banned', 'deleted'],
      default : 'active'
    },

    // delivery addresses
    addresses : [{
      fullAddress : { type : String },
      area        : { type : String, enum : Object.keys(locations) },
      district    : { type : String, enum : Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt }) },
      subDistrict : { type : String, enum : _.flatten(_.map(locations, _.values)) },
      recipient   : { type : String },
      phone       : { type : String },
    }],

    // self pick up addresses
    pickupAddresses : [{
      fullAddress : { type : String },
      area        : { type : String, enum : Object.keys(locations) },
      district    : { type : String, enum : Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt }) },
      subDistrict : { type : String, enum : _.flatten(_.map(locations, _.values)) },
      recipient   : { type : String },
      phone       : { type : String },
      code        : { type : String, default : null },
      workingHour : { type : String, default : null },
    }],

    //credits gained per order completed
    credits : {
      // mongoose: $subtract, $inc
      type    : Number,
      default : 20,
    },

    //kol cash rebate on code use, TODO: phase 2
    cashReward : {
      // mongoose: $subtract, $inc
      type    : Number,
      default : 0,
    },

    //student scheme
    isStudent : { type : Boolean, default : false },
    student   : {
      image  : { type : mongoose.Schema.Types.ObjectId, ref : 'Image', default : null },
      endAt  : { type : Date, default : null },
      status : { type : String, enum : ['pending', 'rejected', 'approved'], default : 'pending' },
    },

    //statistics
    totalOrders : {
      type    : Number,
      default : 0,
    },
    totalSpent  : {
      type    : Number,
      default : 0,
    },

    //user remarks, admin control
    remarks    : {
      type    : String,
      default : '',
    },
    agreeTerms : {
      type    : Boolean,
      default : true,
    },
  },
  {
    timestamps : true,
  }
);


/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id : { $ne : excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};
userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * Virtual
 */
userSchema.virtual('orders', {
  ref          : 'Order',
  localField   : '_id',
  foreignField : 'createdBy',
})

userSchema.virtual('kolProfile', {
  ref          : 'KolProfile',
  localField   : '_id',
  foreignField : 'kol',
  justOne      : true
})

//make virtual work
userSchema.set('toObject', { virtuals : true });
userSchema.set('toJSON', { virtuals : true });
// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
