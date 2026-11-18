const multer = require('multer')
const multerStorage = multer.memoryStorage()
const uniqueFilename = require('unique-filename')
const fs = require("fs-extra")
const sharp = require("sharp")
const catchAsync = require("../utils/catchAsync")
const config = require('../config/config');

// Filter files with multer
const multerFilter = (req, file, cb) => {
  let fileType = ['image/jpeg', 'image/png']
  if (fileType.includes(file.mimetype)) {
    cb(null, true)// save file
  } else {
    cb({ message : 'invalid format' }, false) // wont save file and return error
  }
}

const limits = { fileSize : 1024 * 1024 * 10 }//size limit to 10mb

const uploadImage = multer({
  storage    : multerStorage,
  fileFilter : multerFilter,
  limits     : limits
})

const resizerImage = catchAsync(async (req, res, next) => {
  const today = new Date()
  // Used by multer .array() or .single
  const filename = today.getTime() + '-' + uniqueFilename('')

  const sizes = [
    {
      path   : "large",
      width  : 1920,
      height : null,
    },
    {
      path   : "medium",
      width  : 720,
      height : null,
    },
    {
      path   : "small",
      width  : 360,
      height : null,
    },
  ]

  const uploadPath = './upload/images'

  const fileUrl = `${ config.apiHost }/images`

  // sharp options
  const sharpOptions = {
    fit        : "contain",
    background : { r : 255, g : 255, b : 255 },
  }

  // Check multiple files
  const promises = []

  let filesUploaded = {}

  sizes.map((size) => {
    let imageExt = req.file.mimetype.split("/")[1]
    let imageFilename = `${ filename.split(/\.([^.]+)$/)[0] }-${ size.path }.${ imageExt }`
    let imageUploadPath = uploadPath.concat(`/${ size.path }`)
    fs.mkdirsSync(imageUploadPath)
    filesUploaded[size.path] = {
      filename : imageFilename,
      path     : `${ fileUrl }/${ size.path }/${ imageFilename }`,
    }
    promises.push(sharp(req.file.buffer)
    .resize(size.width, size.height, sharpOptions)
    .toFile(`${ imageUploadPath }/${ imageFilename }`))
  })

  await Promise.all(
    promises
  )

  // Get details of uploaded files: Used by multer .array() or .single()
  req.file = filesUploaded

  next()
})

module.exports = {
  uploadImage,
  resizerImage
}
