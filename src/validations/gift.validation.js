const Joi = require('joi')
const { objectId } = require('./custom.validation')

const createGift = {
  body : Joi.object().keys({
    name        : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    item        : Joi.object().keys({
      type    : Joi.string().required().valid('other', 'item'),
      product : Joi.custom(objectId).allow(null),
      amount  : Joi.number().required(),
    }),
    rules       : Joi.object().keys({
      total    : Joi.number().required(),
      quantity : Joi.number().required(),
    }),
    startAt     : Joi.date().required(),
    endAt       : Joi.date().required().greater(Joi.ref('startAt')),
    published   : Joi.boolean(),
    autoChecked : Joi.boolean(),
    description : Joi.object().keys({
      zh : Joi.string().allow(null, ''),
      en : Joi.string().allow(null, '')
    }),
    images      : Joi.array().items(Joi.custom(objectId)),
  }),
}

const getGifts = {
  query : Joi.object().keys({
    sortBy    : Joi.string(),
    limit     : Joi.number().integer(),
    page      : Joi.number().integer(),
    status    : Joi.string().allow(''),
    published : Joi.boolean(),
  }),
}

const updateGift = {
  params : Joi.object().keys({
    giftId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                name        : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string()
                }),
                item        : Joi.object().keys({
                  type    : Joi.string().required().valid('other', 'item'),
                  product : Joi.custom(objectId).allow(null),
                  amount  : Joi.number(),
                }),
                rules       : Joi.object().keys({
                  total    : Joi.number(),
                  quantity : Joi.number(),
                }),
                startAt     : Joi.date(),
                endAt       : Joi.date().greater(Joi.ref('startAt')),
                autoChecked : Joi.boolean(),
                published   : Joi.boolean(),
                description : Joi.object().keys({
                  zh : Joi.string().allow(null, ''),
                  en : Joi.string().allow(null, '')
                }),
                images      : Joi.array().items(Joi.custom(objectId)),
              })
              .min(1),
}

const deleteGift = {
  params : Joi.object().keys({
    giftId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createGift,
  getGifts,
  updateGift,
  deleteGift,
}
