const Joi = require('joi')
const { objectId, phone } = require('./custom.validation')

const createKeyAccount = {
  body : Joi.object().keys({
    name                : Joi.string().required(),
    description         : Joi.string(),
    skuPrice            : Joi.object().keys({
      item  : Joi.required().custom(objectId),
      price : Joi.number().positive()
    }),
    addresses           : Joi.array().items({
      fullAddress : Joi.string(),
      area        : Joi.string(),
      district    : Joi.string(),
      subDistrict : Joi.string(),
      recipient   : Joi.string(),
      phone       : Joi.string().custom(phone),
      shortName   : Joi.string(),
    }),
    discount            : Joi.array().items(Joi.object().keys({
      quantity : Joi.number().positive(),
      value    : Joi.number().negative(),
      name     : Joi.string(),
    })),
    discountTierEnabled : Joi.boolean(),
    remarks             : Joi.string(),
    publish             : Joi.boolean(),
  }),
}

const getKeyAccounts = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
    status : Joi.string().allow('')
  }),
}

const updateKeyAccount = {
  params : Joi.object().keys({
    keyAccountId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name                : Joi.string().required(),
                description         : Joi.string(),
                skuPrice            : Joi.object().keys({
                  item  : Joi.required().custom(objectId),
                  price : Joi.number().positive()
                }),
                addresses           : Joi.array().items({
                  fullAddress : Joi.string(),
                  area        : Joi.string(),
                  district    : Joi.string(),
                  subDistrict : Joi.string(),
                  recipient   : Joi.string(),
                  phone       : Joi.string().custom(phone),
                  shortName   : Joi.string(),
                }),
                discount            : Joi.array().items(Joi.object().keys({
                  quantity : Joi.number().positive(),
                  value    : Joi.number().negative(),
                  name     : Joi.string(),
                })),
                discountTierEnabled : Joi.boolean(),
                remarks             : Joi.string(),
                publish             : Joi.boolean(),
              })
              .min(1),
}

const deleteKeyAccount = {
  params : Joi.object().keys({
    userId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createKeyAccount,
  getKeyAccounts,
  updateKeyAccount,
  deleteKeyAccount,
}
