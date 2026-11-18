const Joi = require('joi');
const { password, objectId, phone } = require('./custom.validation');
const { locations } = require("../config/locations");
const _ = require('underscore')

const createUser = {
  body : Joi.object().keys({
    email           : Joi.string().required().email(),
    password        : Joi.string().required().custom(password),
    name            : Joi.string().required(),
    gender          : Joi.string().required().valid('m', 'f'),
    role            : Joi.string().valid('user', 'admin', 'super', 'kol'),
    credits         : Joi.number(),
    cashReward      : Joi.number(),
    addresses       : Joi.array().items({
      fullAddress : Joi.string(),
      area        : Joi.string(),
      district    : Joi.string(),
      subDistrict : Joi.string(),
      recipient   : Joi.string(),
      phone       : Joi.string().custom(phone),
    }),
    agreeTerms      : Joi.boolean().required().valid(true),
    status          : Joi.string().valid('active', 'banned', 'deleted'),
    isStudent       : Joi.boolean(),
    isEmailVerified : Joi.boolean(),
    remarks         : Joi.string(),
  }),
};

const getUsers = {
  query : Joi.object().keys({
    name        : Joi.string(),
    role        : Joi.string(),
    sortBy      : Joi.string(),
    search      : Joi.string().allow(''),
    status      : Joi.string().valid('active', 'deleted', 'banned'),
    vipTier     : Joi.string().valid('normal', 'gold', 'diamond').allow(null),
    totalSpent  : Joi.number().allow(''),
    totalOrders : Joi.number().allow(''),
    limit       : Joi.number().integer(),
    page        : Joi.number().integer(),
    isStudent   : Joi.boolean()
  }),
};

const getUser = {
  params : Joi.object().keys({
    userId : Joi.string().custom(objectId),
  }),
};

// admin only
const updateUser = {
  params : Joi.object().keys({
    userId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name            : Joi.string(),
                role            : Joi.string().valid('user', 'admin', 'super', 'kol'),
                email           : Joi.string().email(),
                isKol           : Joi.boolean(),
                gender          : Joi.string().valid('m', 'f'),
                credits         : Joi.number(),
                cashReward      : Joi.number(),
                isEmailVerified : Joi.boolean(),
                status          : Joi.string().valid('active', 'banned', 'deleted'),
                addresses       : Joi.array().items({
                  fullAddress : Joi.string(),
                  area        : Joi.string(),
                  district    : Joi.string(),
                  subDistrict : Joi.string(),
                  recipient   : Joi.string(),
                  phone       : Joi.string().custom(phone),
                  code        : Joi.string().allow(null),
                }),
                pickupAddresses : Joi.array().items({
                  fullAddress : Joi.string(),
                  area        : Joi.string(),
                  district    : Joi.string(),
                  subDistrict : Joi.string(),
                  recipient   : Joi.string(),
                  phone       : Joi.string().custom(phone),
                  code        : Joi.string(),
                  workingHour : Joi.string()
                }),
                isStudent       : Joi.boolean().allow(null),
                student         : Joi.object().keys({
                  image  : Joi.custom(objectId).allow(null),
                  status : Joi.string().valid('pending', 'rejected', 'approved'),
                  endAt  : Joi.date().allow(null),
                }),
                remarks         : Joi.string().allow('')
              })
              .min(1),
};

// user
const updateMyProfile = {
  body : Joi.object()
            .keys({
              name            : Joi.string(),
              gender          : Joi.string().valid('m', 'f'),
              email           : Joi.string().email(),
              addresses       : Joi.array().items({
                fullAddress : Joi.string(),
                area        : Joi.string(),
                district    : Joi.string(),
                subDistrict : Joi.string(),
                recipient   : Joi.string(),
                code        : Joi.string().allow(null),
                phone       : Joi.string().custom(phone),
              }),
              pickupAddresses : Joi.array().items({
                fullAddress : Joi.string(),
                area        : Joi.string(),
                district    : Joi.string(),
                subDistrict : Joi.string(),
                recipient   : Joi.string(),
                phone       : Joi.string().custom(phone),
                code        : Joi.string(),
                workingHour : Joi.string(),
              }),
              student         : Joi.object().keys({
                image : Joi.custom(objectId)
              }),
            })
            .min(1),
};

const updateMyKolProfile = {
  body : Joi.object()
            .keys({
              legalName       : Joi.string().required(),
              id5Digits       : Joi.string().required(),
              fps_type        : Joi.string().valid('fps_id', 'phone_no', 'email', 'fps_qrcode'),
              fps_number      : Joi.string(),
              fpsQRCodeImages : Joi.array(),
            })
            .min(1),
};


const resubmitStudentIdentity = {
  body : Joi.object()
            .keys({
              student : Joi.object().keys({
                image : Joi.custom(objectId)
              }),
            })
            .min(1),
};


const deleteUser = {
  params : Joi.object().keys({
    userId : Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateMyProfile,
  resubmitStudentIdentity,
  updateMyKolProfile
};
