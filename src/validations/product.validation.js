const Joi = require("joi");
const { password, objectId, phone } = require("./custom.validation");

const createProduct = {
  body : Joi.object().keys({
    images              : Joi.array(),
    productId           : Joi.string().required(),
    productType         : Joi.string().valid("treatment", "product"),
    description         : Joi.object().keys({
      zh : Joi.string().allow(""),
      en : Joi.string().allow("")
    }),
    category            : Joi.custom(objectId),
    internalName        : Joi.string().required(),
    name                : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    madeIn              : Joi.object().keys({
      zh : Joi.string().required(),
      en : Joi.string().required()
    }),
    price               : Joi.number().required(),
    discountPrice       : Joi.number(),
    vipPrice            : Joi.number(),
    maxPurchaseQtyPerOrder : Joi.number().integer().min(0),
    discount            : Joi.array().items(Joi.object().keys({
      quantity : Joi.number().positive(),
      value    : Joi.number().negative()
    })),
    discountTierEnabled : Joi.boolean(),
    ingredients         : Joi.object().keys({
      zh : Joi.string().allow(""),
      en : Joi.string().allow("")
    }),
    nutritionInfo       : Joi.object().keys({
      servingText  : {
        zh : Joi.string(),
        en : Joi.string()
      },
      calories     : Joi.number(),
      protein      : Joi.number(),
      fat          : {
        saturatedFat : Joi.number(),
        transFat     : Joi.number(),
        total        : Joi.number()
      },
      carbohydrate : {
        fibre  : Joi.number(),
        sugars : Joi.number(),
        total  : Joi.number()
      },
      sodium       : Joi.number()
    }),
    edibleMethods       : Joi.string().allow(""),
    edibleMethodsEn     : Joi.string().allow(""),
    soldOut             : Joi.boolean(),
    publish             : Joi.boolean(),
    featured            : Joi.boolean(),
    isBundled           : Joi.boolean(),
    bundleItems         : Joi.array().items({
      product  : Joi.string().required().custom(objectId),
      quantity : Joi.number().required().positive()
    }),
    addons              : Joi.array().items({
      name  : Joi.object().keys({
        zh : Joi.string(),
        en : Joi.string()
      }),
      price : Joi.number()
    })
  })
};

const getProducts = {
  query : Joi.object().keys({
    sortBy      : Joi.string(),
    search      : Joi.string().allow(""),
    category    : Joi.custom(objectId).allow(""),
    status      : Joi.string().allow(""),
    limit       : Joi.number().integer(),
    page        : Joi.number().integer(),
    categorized : Joi.number().integer().equal(1)
  })
};

const updateProduct = {
  params : Joi.object().keys({
    productId : Joi.required().custom(objectId)
  }),
  body   : Joi.object().keys({
    images              : Joi.array(),
    productId           : Joi.string(),
    productType         : Joi.string().valid("treatment", "product"),
    description         : Joi.object().keys({
      zh : Joi.string().allow(""),
      en : Joi.string().allow("")
    }),
    archive             : Joi.boolean(),
    ingredients         : Joi.object().keys({
      zh : Joi.string().allow(""),
      en : Joi.string().allow("")
    }),
    nutritionInfo       : Joi.object().keys({
      servingText  : {
        zh : Joi.string(),
        en : Joi.string()
      },
      calories     : Joi.number().allow(""),
      protein      : Joi.number().allow(""),
      fat          : Joi.object().keys({
        saturatedFat : Joi.number().allow(""),
        transFat     : Joi.number().allow(""),
        total        : Joi.number().allow("")
      }),
      carbohydrate : Joi.object().keys({
        fibre  : Joi.number().allow(""),
        sugars : Joi.number().allow(""),
        total  : Joi.number().allow("")
      }),
      sodium       : Joi.number().allow("")
    }),
    edibleMethods       : Joi.string().allow(""),
    edibleMethodsEn     : Joi.string().allow(""),
    category            : Joi.custom(objectId),
    internalName        : Joi.string(),
    name                : Joi.object().keys({
      zh : Joi.string(),
      en : Joi.string()
    }),
    madeIn              : Joi.object().keys({
      zh : Joi.string(),
      en : Joi.string()
    }),
    soldOut             : Joi.boolean(),
    publish             : Joi.boolean(),
    featured            : Joi.boolean(),
    archived            : Joi.boolean(),
    price               : Joi.number(),
    discountPrice       : Joi.number(),
    vipPrice            : Joi.number(),
    maxPurchaseQtyPerOrder : Joi.number().integer().min(0),
    discount            : Joi.array().items(Joi.object().keys({
      quantity : Joi.number().positive(),
      value    : Joi.number().negative()
    })),
    discountTierEnabled : Joi.boolean(),
    createdBy           : Joi.custom(objectId).allow(null),
    isBundled           : Joi.boolean(),
    bundleItems         : Joi.array().items({
      product  : Joi.string().required().custom(objectId),
      quantity : Joi.number().required().positive()
    }),
    addons              : Joi.array().items({
      name  : Joi.object().keys({
        zh : Joi.string(),
        en : Joi.string()
      }),
      price : Joi.number()
    })
  })
};

const bulkUpdateProducts = {
  body : Joi.object().keys({
    productIds : Joi.array().required(),
    updateBody : Joi.object().keys({
      /* currently only allow bult update in discount price! */
      // images        : Joi.array(),
      // description   : Joi.object().keys({
      //   zh : Joi.string().allow(''),
      //   en : Joi.string().allow(''),
      // }),
      // archive       : Joi.boolean(),
      // ingredients   : Joi.object().keys({
      //   zh : Joi.string().allow(''),
      //   en : Joi.string().allow(''),
      // }),
      // nutritionInfo : Joi.object().keys({
      //   servingText  : {
      //     zh : Joi.string(),
      //     en : Joi.string()
      //   },
      //   calories     : Joi.number().allow(''),
      //   protein      : Joi.number().allow(''),
      //   fat          : Joi.object().keys({
      //     saturatedFat : Joi.number().allow(''),
      //     transFat     : Joi.number().allow(''),
      //     total        : Joi.number().allow('')
      //   }),
      //   carbohydrate : Joi.object().keys({
      //     fibre  : Joi.number().allow(''),
      //     sugars : Joi.number().allow(''),
      //     total  : Joi.number().allow('')
      //   }),
      //   sodium       : Joi.number().allow('')
      // }),
      // category      : Joi.custom(objectId),
      // internalName  : Joi.string(),
      // name          : Joi.object().keys({
      //   zh : Joi.string(),
      //   en : Joi.string(),
      // }),
      // madeIn        : Joi.object().keys({
      //   zh : Joi.string(),
      //   en : Joi.string(),
      // }),
      // soldOut       : Joi.boolean(),
      // publish       : Joi.boolean(),
      // archived      : Joi.boolean(),
      // price         : Joi.number(),
      discountPrice : Joi.number()
      // createdBy     : Joi.custom(objectId)
    })

  })
};


const deleteProduct = {
  params : Joi.object().keys({
    productId : Joi.string().custom(objectId)
  })
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts
};
