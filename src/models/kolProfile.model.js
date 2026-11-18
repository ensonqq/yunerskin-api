const mongoose = require('mongoose')
const { toJSON, paginate } = require('./plugins')

//db.vouchers.updateMany({}, {$set: {"remarks": ""}});
const schema = mongoose.Schema(
  {
    legalName       : { type : String, required : true },
    id5Digits       : { type : String, required : true },
    fps_type        : { type : String, enum : ['fps_id', 'phone_no', 'email', 'fps_qrcode'], default : 'fps_qrcode' },
    fps_number      : { type : String, default : null },
    kol             : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true },
    createdBy       : { type : mongoose.SchemaTypes.ObjectId, ref : 'User', required : true },
    remarks         : { type : String, default : null },
    fpsQRCodeImages : [{ type : mongoose.Schema.Types.ObjectId, ref : 'Image' }]
  },
  {
    timestamps : true,
  },
)

/**
 * Virtual
 */
schema.virtual('sales', {
  ref          : 'KolSales',
  localField   : 'kol',
  foreignField : 'kol',
})
// virtual tobe exported
schema.set('toObject', { virtuals : true });
schema.set('toJSON', { virtuals : true });

// add plugin that converts mongoose to json
schema.plugin(toJSON)
schema.plugin(paginate)

/**
 * @typedef kolProfileModel
 */
const kolProfileModel = mongoose.model('KolProfile', schema)

module.exports = kolProfileModel
