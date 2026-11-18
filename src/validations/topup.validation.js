const Joi = require('joi')
const { password, objectId, phone } = require('./custom.validation')

const createTopup = {
  body : Joi.object().keys({
    name          : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }),
    title         : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }),
    desc          : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }),
    validity      : Joi.string().required().valid('permanent'),
    price         : Joi.number().required(),
    credits       : Joi.number().required(),
    maxQtyPerUser : Joi.number().required(),
    publish       : Joi.boolean().required(),
    remarks       : Joi.string().allow(''),
    images        : Joi.array().items(Joi.custom(objectId)),
  }),
}

const createTopupOrder = {
  body : Joi.object().keys({
    topupCard : Joi.custom(objectId).required(),
    email     : Joi.string().required().email(),
    payment   : Joi.object().keys({
      paymentType : Joi.string().required().valid('qfpay')
    }),
  }),
}


const getTopups = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
    status : Joi.string().allow(''),
  }),
}

const updateTopup = {
  params : Joi.object().keys({
    topupId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name          : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string(),
                }),
                title         : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string(),
                }),
                desc          : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string(),
                }),
                validity      : Joi.string().valid('permanent'),
                price         : Joi.number(),
                credits       : Joi.number(),
                maxQtyPerUser : Joi.number(),
                publish       : Joi.boolean(),
                remarks       : Joi.string().allow(''),
                images        : Joi.array().items(Joi.custom(objectId)),
              })
              .min(1),
}

module.exports = {
  createTopup,
  getTopups,
  updateTopup,
  createTopupOrder
}
