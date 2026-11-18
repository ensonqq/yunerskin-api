const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createKolProfile = {
  body : Joi.object().keys({
    legalName  : Joi.string().required(),
    fps_type   : Joi.string().required(),
    fps_number : Joi.string().required(),
    kol        : Joi.required().custom(objectId),
    remarks    : Joi.string(),
  }),
};

const getKolProfile = {
  params : Joi.object().keys({
    userId : Joi.string().custom(objectId),
  }),
};

// admin only
const updateKolProfile = {
  params : Joi.object().keys({
    userId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
              .keys({
                legalName  : Joi.string(),
                fps_type   : Joi.string(),
                fps_number : Joi.string(),
                kol        : Joi.required().custom(objectId),
                remarks    : Joi.string().allow(''),
              })
              .min(1),
};


const deleteKolProfile = {
  params : Joi.object().keys({
    userId : Joi.string().custom(objectId),
  }),
};

module.exports = {
  createKolProfile,
  getKolProfile,
  updateKolProfile,
  deleteKolProfile,
};
