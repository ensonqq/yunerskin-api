const Joi = require('joi');
const { objectId } = require('./custom.validation');
const { locations } = require("../config/locations");
const _ = require("underscore");

const getOrders = {
  query : Joi.object().keys({
    createdAtFrom : Joi.string(),
    createdAtTo   : Joi.string(),
    deliveryDay   : Joi.string(),
    search        : Joi.string().allow(''),
    sortBy        : Joi.string(),
    limit         : Joi.number().integer(),
    page          : Joi.number().integer(),
    orderStatus   : Joi.string().valid('pending_payment', 'payment_failed', 'confirmed', 'cancelled'),
  }),
};

const createOrder = {
  body : Joi.object().keys({
    locale             : Joi.string(),
    email              : Joi.string().required().email(),
    recipient          : Joi.string().allow(null, ""),
    phone              : Joi.string().required().length(8),
    area               : Joi.string().allow(null, "").valid(...Object.keys(locations)),
    district           : Joi.string().allow(null, "").valid(...Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt })),
    subDistrict        : Joi.string().allow(null, "").valid(..._.flatten(_.map(locations, _.values))),
    deliveryDay        : Joi.string().allow(null, ""),
    deliveryTimeSlot   : Joi.string().allow(null, ""),
    fullAddress        : Joi.string().allow(null, ""),
    items              : Joi.array().items({
      product   : Joi.string().required().custom(objectId),
      quantity  : Joi.number().required().positive(),
      unitPrice : Joi.number().required().positive(),
      addons    : Joi.object().keys({
        name  : Joi.object().keys({
          zh : Joi.string(),
          en : Joi.string()
        }),
        price : Joi.number()
      })
    }),
    gift               : Joi.string().custom(objectId),
    creditsUsed        : Joi.number().positive().allow(0),
    voucherUsed        : Joi.string().allow(null),
    payment            : Joi.object().keys({
      paymentType : Joi.string().required().valid('qfpay')
    }),
    deliveryType       : Joi.string().allow(null, ""),
    pickupLocationCode : Joi.string().allow(null),
  }),
};


const getOrder = {
  params : Joi.object().keys({
    userId      : Joi.string().custom(objectId),
    orderNumber : Joi.string(),
  }),
};

const getOrderStatus = {
  query : Joi.object().keys({
    accessCode : Joi.string().required(),
  }),
};

const getUserOrders = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
  }),
};

const updateOrder = {
  body : Joi.object()
            .keys({
              email              : Joi.string(),
              recipient          : Joi.string().allow(null, ""),
              phone              : Joi.string(),
              area               : Joi.string().allow(null, "").valid(...Object.keys(locations)),
              district           : Joi.string().allow(null, "").valid(...Object.keys({ ...locations.hk, ...locations.kln, ...locations.nt })),
              subDistrict        : Joi.string().allow(null, "").valid(..._.flatten(_.map(locations, _.values))),
              deliveryDay        : Joi.string().allow(null, ""),
              deliveryTimeSlot   : Joi.string().allow(null, ""),
              fullAddress        : Joi.string().allow(null, ""),
              items              : Joi.array().items({
                product   : Joi.string().custom(objectId),
                quantity  : Joi.number().positive(),
                unitPrice : Joi.number().positive(),
                addons    : Joi.object().keys({
                  name  : Joi.object().keys({
                    zh : Joi.string(),
                    en : Joi.string()
                  }),
                  price : Joi.number()
                })
              }),
              createdBy          : Joi.string().custom(objectId),
              orderStatus        : Joi.string().valid('pending_payment', 'payment_failed', 'confirmed', 'cancelled'),
              deliveryType       : Joi.string().allow(null, ""),
              pickupLocationCode : Joi.string().allow(null),
              printed            : Joi.boolean(),
              remarks            : Joi.string().allow("")
            })
            .min(1),
};

const updateOrderToPrinted = {
  body : Joi.array().items(Joi.custom(objectId)).min(1),
};


module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  updateOrderToPrinted,
  getOrderStatus
};
