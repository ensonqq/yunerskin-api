const Joi = require('joi')
const { password, objectId, phone } = require('./custom.validation')

const createPromotion = {
  body : Joi.object().keys({
    images  : Joi.array().items(Joi.custom(objectId)),
    name    : Joi.string().required(),
    type    : Joi.string().required().valid('student', 'main', 'all'),
    publish : Joi.boolean(),
    url     : Joi.string().allow(""),
  }),
}

const getPromotions = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
    status : Joi.string().allow(''),
    type   : Joi.string().required().valid('student', 'main'),
  }),
}

const updatePromotion = {
  params : Joi.object().keys({
    promotionId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                images  : Joi.array().items(Joi.custom(objectId)),
                name    : Joi.string(),
                publish : Joi.boolean(),
                type    : Joi.string().valid('student', 'main', 'all'),
                url     : Joi.string().allow(""),
              })
              .min(1),
}

const deletePromotion = {
  params : Joi.object().keys({
    promotionId : Joi.string().custom(objectId),
  }),
}

module.exports = {
  createPromotion,
  getPromotions,
  updatePromotion,
  deletePromotion,
}
