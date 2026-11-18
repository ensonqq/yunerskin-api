const Joi = require('joi')
const { objectId, phone } = require('./custom.validation')

const createRetail = {
  body : Joi.object().keys({
    images      : Joi.array().items(Joi.custom(objectId)),
    name        : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    phone       : Joi.string().required().length(8),
    published   : Joi.boolean(),
    area        : Joi.string().required().valid('hk', 'kln', 'nt'),
    fullAddress : Joi.string().required(),
  }),
}

const getRetails = {
  query : Joi.object().keys({
    sortBy    : Joi.string(),
    limit     : Joi.number().integer(),
    page      : Joi.number().integer(),
    status    : Joi.string().allow(''),
    area      : Joi.string(),
    published : Joi.boolean(),
  }),
}

const updateRetail = {
  params : Joi.object().keys({
    retailId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                images      : Joi.array().items(Joi.custom(objectId)),
                name        : Joi.object().keys({
                  zh : Joi.string(),
                  en : Joi.string()
                }),
                published   : Joi.boolean(),
                phone       : Joi.string().length(8),
                area        : Joi.string().valid('hk', 'kln', 'nt'),
                fullAddress : Joi.string(),
              })
              .min(1),
}

const deleteRetail = {
  params : Joi.object().keys({
    retailId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createRetail,
  getRetails,
  updateRetail,
  deleteRetail,
}
