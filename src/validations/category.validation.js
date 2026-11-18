const Joi = require('joi')
const { objectId } = require('./custom.validation')

const createCategory = {
  body : Joi.object().keys({
    images              : Joi.array(),
    name                : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    slug                : Joi.string(),
    group               : Joi.string().custom(objectId).allow(null, ''),
    sortOrder           : Joi.number().integer(),
    slogan              : Joi.object().keys({
      zh : Joi.string().allow(''),
      en : Joi.string().allow('')
    }),
    publish             : Joi.boolean(),
    buyXGetYFreeEnabled : Joi.boolean(),
    buyXGetYFree        : Joi.array().items(Joi.object().keys({
      x : Joi.number().positive(),
      y : Joi.number().positive()
    })),
  }),
}

const getCategories = {
  query : Joi.object().keys({
    sortBy   : Joi.string(),
    limit    : Joi.number().integer(),
    page     : Joi.number().integer(),
    products : Joi.number().integer(),
    status   : Joi.string().allow(''),
    search   : Joi.string().allow(''),
  }),
}

const getCategoryProducts = {
  query : Joi.object().keys({
    sortBy : Joi.string(),
    limit  : Joi.number().integer(),
    page   : Joi.number().integer(),
  }),
}

const updateCategory = {
  params : Joi.object().keys({
    categoryId : Joi.required().custom(objectId),
  }),
  body   : Joi.object()
               .keys({
                 images              : Joi.array().items(Joi.custom(objectId)),
                 name                : Joi.object().keys({
                   zh : Joi.string(),
                   en : Joi.string()
                 }),
                 slug                : Joi.string(),
                 group               : Joi.string().custom(objectId).allow(null, ''),
                 sortOrder           : Joi.number().integer(),
                 slogan              : Joi.object().keys({
                   zh : Joi.string().allow(''),
                   en : Joi.string().allow('')
                 }),
                 publish             : Joi.boolean(),
                 buyXGetYFreeEnabled : Joi.boolean(),
                 buyXGetYFree        : Joi.array().items(Joi.object().keys({
                   x : Joi.number().positive(),
                   y : Joi.number().positive()
                 })),
               })
               .min(1),
}

const deleteCategory = {
  params : Joi.object().keys({
    categoryId : Joi.string().custom(objectId),
  }),
}

// ── Category Group validations ──────────────────────────────────────────────

const createGroup = {
  body : Joi.object().keys({
    name : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required(),
    }).required(),
    publish : Joi.boolean(),
  }),
}

const updateGroup = {
  params : Joi.object().keys({
    groupId : Joi.required().custom(objectId),
  }),
  body   : Joi.object().keys({
    name : Joi.object().keys({
      zh : Joi.string(),
      en : Joi.string(),
    }),
    publish : Joi.boolean(),
  }).min(1),
}

const deleteGroup = {
  params : Joi.object().keys({
    groupId : Joi.required().custom(objectId),
  }),
}

// ── Menu Order validations ──────────────────────────────────────────────────

const updateMenuOrder = {
  body : Joi.object().keys({
    items : Joi.array().items(
      Joi.object().keys({
        type  : Joi.string().valid('group', 'category').required(),
        refId : Joi.string().custom(objectId).required(),
      })
    ).required(),
  }),
}

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  createGroup,
  updateGroup,
  deleteGroup,
  updateMenuOrder,
}
