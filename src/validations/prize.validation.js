const Joi = require('joi')
const { objectId } = require('./custom.validation')

const createPrize = {
  body : Joi.object().keys({
    name        : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    festival    : Joi.string().required(),
    items       : Joi.array().items({
      type    : Joi.string().required().valid('cash', 'item'),
      product : Joi.custom(objectId).allow(null),
      amount  : Joi.number().required(),
    }).length(8),
    published   : Joi.boolean(),
    description : Joi.object().keys({
      zh : Joi.string().allow(null, ''),
      en : Joi.string().allow(null, '')
    }),
    images      : Joi.array().items(Joi.custom(objectId)),
  }),
}

const updateMyPrize = {
  body : Joi.object().keys({
    prizeId : Joi.string().custom(objectId).required()
  }),
}

const getPrizes = {
  query : Joi.object().keys({
    sortBy    : Joi.string(),
    limit     : Joi.number().integer(),
    page      : Joi.number().integer(),
    status    : Joi.string().allow(''),
    area      : Joi.string(),
    published : Joi.boolean(),
  }),
}

const updatePrize = {
  params : Joi.object().keys({
    prizeId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name        : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string()
                }),
                festival    : Joi.string(),
                items       : Joi.array().items({
                  _id     : Joi.custom(objectId),
                  type    : Joi.string().required().valid('cash', 'item'),
                  product : Joi.custom(objectId).allow(null),
                  amount  : Joi.number()
                }).length(8),
                published   : Joi.boolean(),
                description : Joi.object().keys({
                  zh : Joi.string().allow(null, ''),
                  en : Joi.string().allow(null, '')
                }),
                images      : Joi.array().items(Joi.custom(objectId)),
                createdBy   : Joi.custom(objectId).allow(null)
              })
              .min(1),
}

const deletePrize = {
  params : Joi.object().keys({
    prizeId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createPrize,
  getPrizes,
  updatePrize,
  deletePrize,
  updateMyPrize
}
