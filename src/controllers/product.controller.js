const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { productService } = require('../services')
const _ = require("underscore")
const { Product } = require("../models");

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct({ ...req.body, createdBy : req.user._id, lastEditBy : req.user._id })
  res.status(httpStatus.CREATED).send(product)
})

const getProducts = catchAsync(async (req, res) => {
  const basicFilter = pick(req.query, ['category'])
  const advanceFilter = pick(req.query, ['search', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = 'images category'

  // construct orders filtering
  if (Object.keys(basicFilter).length || Object.keys(advanceFilter).length) {
    var filter = { $and : [] };
    _.forEach(basicFilter, function (value, key) {
      filter.$and.push({ [key] : value });
    });


    // handling status
    // enum: published unpublished archived
    if (advanceFilter.status) {
      const status = advanceFilter.status
      const statusMap = {
        published   : { publish : true },
        unpublished : { publish : false },
        archived    : { archive : false },
      }

      filter.$and.push(statusMap[status]);
    }

    //ignore all filters
    if (advanceFilter.search) {
      filter.$and.push({
        $or : ['name.zh', 'name.en', 'internalName', 'productId'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
      })
    }
  }

  const result = await productService.queryProducts(filter, options)
  return res.send(result)
})

const getProductForGMCList = catchAsync(async (req, res) => {
  // GMC data sheet format
  // sheet location: https://docs.google.com/spreadsheets/d/1kPrGqlnHrThHQiT1mplIRZIDzfHFKhMyKGgTPpPRmi4/edit#gid=2089753791
  //id	title	description	link	condition	price	availability	image link	brand	google product category	identifier_exists
  const result = await Product.find({ publish : true }).populate('images').exec()

  const structured = result.map(product => {
    return {
      'id'                      : product._id,
      'title'                   : product.name.zh,
      'description'             : `${ product.nutritionInfo.servingText.zh }, 卡路里: ${ product.nutritionInfo.calories }, 蛋白質: ${ product.nutritionInfo.protein }`,
      'link'                    : 'https://Optmeal.com/product/' + encodeURIComponent(product.name.zh),
      'condition'               : 'new',
      'price'                   : (product.discountPrice || product.price) + ' HKD',
      'availability'            : 'in_stock',
      'image link'              : product.images[0].medium.path,
      'brand'                   : 'Optmeal',
      'google product category' : '499988',
      'identifier_exists'       : 'false',
    }
  })

  return res.send(structured)
})


const getProduct = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.productId)
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found')
  }
  res.send(product)
})

const getProductByName = catchAsync(async (req, res) => {
  console.log(decodeURI(req.params.productName))
  const product = await productService.getProductByName(decodeURI(req.params.productName))
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found')
  }
  res.send(product)
})
const mapCartItems = catchAsync(async (req, res) => {
  const items = await productService.mapCartItems(req.body.items)
  res.send(items)
})

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProductById(req.params.productId, req.body)
  res.send(product)
})

const deleteProduct = catchAsync(async (req, res) => {
  await productService.deleteProductById(req.params.productId)
  res.status(httpStatus.NO_CONTENT).send()
})


const bulkUpdateDiscountPrice = catchAsync(async (req, res) => {
  const products = await productService.bulkUpdateByProductIds(req.body.productIds, req.body.updateBody)
  return res.send(products)
})

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductByName,
  mapCartItems,
  getProductForGMCList,
  bulkUpdateDiscountPrice
}
