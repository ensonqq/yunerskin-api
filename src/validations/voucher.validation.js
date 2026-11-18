const Joi = require('joi')
const { objectId } = require('./custom.validation')

const createVoucher = {
  body : Joi.object().keys({
    code              : Joi.string().required(),
    type              : Joi.string().required().valid('percent', 'fixed', 'buyXGetYFree'),
    startAt           : Joi.date().required(),
    endAt             : Joi.date().required().greater(Joi.ref('startAt')),
    limited           : Joi.boolean(),
    active            : Joi.boolean(),
    moq               : Joi.number(),
    mov               : Joi.number(),
    usageCnt          : Joi.number().integer().positive().allow(0),
    availableUsageCnt : Joi.number().integer().positive().allow(0),
    kolUser           : Joi.custom(objectId).allow(null),
    kolStartAt        : Joi.date().allow(null),
    kolEndAt          : Joi.date().greater(Joi.ref('kolStartAt')).allow(null),
    value             : Joi.number().integer().negative(),
    name              : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }),
    remarks           : Joi.string().allow(''),
  }),
}

const getVouchers = {
  query : Joi.object().keys({
    sortBy  : Joi.string(),
    limit   : Joi.number().integer().positive(),
    page    : Joi.number().integer(),
    status  : Joi.string(),
    search  : Joi.string(),
    kolUser : Joi.boolean(),
  }),
}

const updateVoucher = {
  params : Joi.object().keys({
    voucherId : Joi.required().custom(objectId),
  }),
  body   : Joi.object().keys({
    code              : Joi.string(),
    startAt           : Joi.date(),
    endAt             : Joi.date().greater(Joi.ref('startAt')),
    limited           : Joi.boolean(),
    active            : Joi.boolean(),
    moq               : Joi.number(),
    mov               : Joi.number(),
    name              : Joi.object().keys({
      zh : Joi.string(),
      en : Joi.string(),
    }),
    availableUsageCnt : Joi.number(),
    kolUser           : Joi.string().custom(objectId).allow(null),
    kolStartAt        : Joi.date().allow(null),
    kolEndAt          : Joi.date().greater(Joi.ref('kolStartAt')).allow(null),
    type              : Joi.string().valid('percent', 'fixed', 'buyXGetYFree'),
    value             : Joi.number().integer().negative(),
    remarks           : Joi.string().allow(''),
  })
}

const deleteVoucher = {
  params : Joi.object().keys({
    voucherId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createVoucher,
  getVouchers,
  updateVoucher,
  deleteVoucher,
}
