const Joi = require('joi');
const { objectId } = require('./custom.validation');

const updateCart = {
  body : Joi.object().keys({
    items : Joi.array().items({
      product  : Joi.string().custom(objectId),
      quantity : Joi.number().positive(),
      addons   : Joi.object().keys({
        name  : Joi.object().keys({
          zh : Joi.string(),
          en : Joi.string()
        }),
        price : Joi.number()
      })
    }),
  }),
}

module.exports = {
  updateCart,
}
