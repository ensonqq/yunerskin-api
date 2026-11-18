const Joi = require('joi')
const { password, objectId, phone } = require('./custom.validation')

const createCreditRedemption = {
  body : Joi.object().keys({
    name         : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }),
    credits      : Joi.number().required(),
    maxRedeemQty : Joi.number().required(),
    publish      : Joi.boolean().required(),
    remarks      : Joi.string().allow(''),
    images       : Joi.array().items(Joi.custom(objectId)),
  }),
}

const getCreditRedemptions = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
    status : Joi.string().allow(''),
  }),
}
const getCreditRedemptionLogs = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
  }),
}

const updateCreditRedemption = {
  params : Joi.object().keys({
    creditRedemptionId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name         : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string(),
                }),
                credits      : Joi.number(),
                maxRedeemQty : Joi.number(),
                publish      : Joi.boolean(),
                remarks      : Joi.string().allow(''),
                images       : Joi.array().items(Joi.custom(objectId)),
              })
              .min(1),
}

module.exports = {
  createCreditRedemption,
  getCreditRedemptions,
  updateCreditRedemption,
  getCreditRedemptionLogs
}
