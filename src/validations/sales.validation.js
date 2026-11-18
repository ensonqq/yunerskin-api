const Joi = require('joi')
const { objectId } = require("./custom.validation");

const getSales = {
  query : Joi.object().keys({
    sortBy     : Joi.string(),
    limit      : Joi.number().integer(),
    page       : Joi.number().integer(),
    reportType : Joi.string().required()
  }),
}
const getKolSales = {
  query : Joi.object().keys({
    date       : Joi.string().required(),
    sortBy     : Joi.string(),
    limit      : Joi.number().integer(),
    page       : Joi.number().integer(),
    reportType : Joi.string().required()
  }),
}

const deleteKolSales = {
  params : Joi.object().keys({
    kolSalesId : Joi.string().custom(objectId),
  }),
}

const updateKolSales = {
  query : Joi.object().keys({
    settlement : Joi.custom(objectId).allow(null),
  }),
}

module.exports = {
  getSales,
  getKolSales,
  updateKolSales,
  deleteKolSales
}
