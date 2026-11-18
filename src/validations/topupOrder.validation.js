const Joi = require('joi');
const { objectId } = require('./custom.validation');
const { locations } = require("../config/locations");
const _ = require("underscore");

const getTopupOrders = {
  query : Joi.object().keys({
    createdAtFrom : Joi.string(),
    createdAtTo   : Joi.string(),
    search        : Joi.string().allow(''),
    sortBy        : Joi.string(),
    limit         : Joi.number().integer(),
    page          : Joi.number().integer(),
    orderStatus   : Joi.string().valid('pending_payment', 'payment_failed', 'confirmed', 'cancelled'),
  }),
};

const getTopupOrder = {
  params : Joi.object().keys({
    userId      : Joi.string().custom(objectId),
    orderNumber : Joi.string(),
  }),
};

const getTopupOrderStatus = {
  query : Joi.object().keys({
    accessCode : Joi.string().required(),
  }),
};

const getUserTopupOrders = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
  }),
};

const updateTopupOrder = {
  body : Joi.object()
            .keys({
              email       : Joi.string(),
              orderStatus : Joi.string().valid('pending_payment', 'payment_failed', 'confirmed', 'cancelled'),
              remarks     : Joi.string().allow("")
            })
            .min(1),
};


module.exports = {
  getTopupOrders,
  getTopupOrder,
  updateTopupOrder,
  getUserTopupOrders,
  getTopupOrderStatus
};
