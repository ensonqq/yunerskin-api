const httpStatus = require('http-status');
const { Image, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");

//get all image
exports.get_all_images = catchAsync(async (req, res, next) => {
  const filter = pick(req.query, [])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  const images = await Image.paginate(filter, options);
  return res.send(images)
})

//upload image
exports.uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new ApiError({
      message : 'image upload file error',
      status  : httpStatus.NO_CONTENT,
    })
  }

  const image = await new Image({
    ...req.file, createdBy : req.user._id
  }).save()

  return res.status(httpStatus.CREATED).send(image);
})


//upload image
exports.userUploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new ApiError({
      message : 'image upload file error',
      status  : httpStatus.NO_CONTENT,
    })
  }

  const image = await new Image({ ...req.file }).save()

  return res.status(httpStatus.CREATED).send(image);
})
