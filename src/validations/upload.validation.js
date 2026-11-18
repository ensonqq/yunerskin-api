const Joi = require('joi');

const getImages = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
  }),
}

module.exports = {
  getImages
};
