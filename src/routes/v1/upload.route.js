const express = require('express')
const uploadController = require('../../controllers/upload.controller')
const auth = require('../../middlewares/auth')
const validate = require('../../middlewares/validate')
const uploadValidation = require('../../validations/upload.validation')
const { uploadImage, resizerImage } = require('../../middlewares/upload')
const router = express.Router()
const { studentImageUploadLimited } = require("../../middlewares/rateLimiter");

/**
 * @swagger
 * /all_images:
 *   get:
 *     tags:
 *     - "image"
 *     summary: This should return all images (admin role).
 *     security:
 *       - JWT: []
 *     responses:
 *       '200':
 *         description: A successful response
 *
 */
// TODO: auth & role seperation
router.get('/all_images', auth('getImages'), validate(uploadValidation.getImages), uploadController.get_all_images)
      .post('/image', auth('manageImages'), uploadImage.single('file'), resizerImage, uploadController.uploadImage)
      .post('/studentImage', studentImageUploadLimited, uploadImage.single('file'), resizerImage, uploadController.userUploadImage)

module.exports = router
