const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { categoryService } = require('../services')
const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.body)
  res.status(httpStatus.CREATED).send(category)
})

const getCategories = catchAsync(async (req, res) => {
  const advanceFilter = pick(req.query, ['status', 'search'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  const filter = {}
  if (advanceFilter.status) {
    if (!filter.$and) filter.$and = []
    const status = advanceFilter.status
    const statusMap = {
      published   : { publish : true },
      unpublished : { publish : false },
    }

    filter.$and.push(statusMap[status]);
  }

  if (advanceFilter.search) {
    if (!filter.$and) filter.$and = []

    filter.$and.push({
      $or : ['name.zh', 'name.en', 'phone'].map(item => ({ [item] : new RegExp(advanceFilter.search, 'i') }))
    })
  }

  options.populate = [{ path : 'images' }]
  if (req.query.products) {
    options.populate.push({
      path     : 'products',
      populate : 'images category'
    })
  }

  const result = await categoryService.queryCategories(filter, options)
  return res.send(result)
})

// Matches a 24-character hex MongoDB ObjectId
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const getCategory = catchAsync(async (req, res) => {
  const identifier = req.params.categoryId;
  let category;

  if (OBJECT_ID_RE.test(identifier)) {
    // Called with a real ObjectId (e.g. from admin panel)
    category = await categoryService.getCategoryById(identifier);
  } else {
    // Called with a slug (e.g. from storefront: /categories/bbq-chicken)
    category = await categoryService.getCategoryBySlug(identifier);
  }

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found')
  }
  res.send(category)
})


const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategoryById(req.params.categoryId, req.body)
  res.send(category)
})

const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategoryById(req.params.categoryId)
  res.status(httpStatus.NO_CONTENT).send()
})

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
}
