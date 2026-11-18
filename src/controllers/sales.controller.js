const httpStatus = require('http-status')
const pick = require('../utils/pick')
const ApiError = require('../utils/ApiError')
const catchAsync = require('../utils/catchAsync')
const { salesService } = require('../services')
const _ = require('underscore')
const { kolMonthlySales } = require('../report/report')

const getSales = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['reportType'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  options.populate = [
    {
      path     : 'catSummary',
      populate : {
        path : 'category',
      }
    },
    {
      path     : 'skuSellingPrice',
      populate : {
        path     : 'product',
        populate : [{ path : 'category', populate : [{ path : 'group' }] }]
      }
    }]

  const result = await salesService.querySales(filter, options)
  return res.send(result)
})

const getTopupSales = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['reportType'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  const result = await salesService.queryTopupSales(filter, options)
  return res.send(result)
})

const getKolSales = catchAsync(async (req, res) => {
  const filter = _.pick(req.query, ['date'])
  const options = pick(req.query, ['sortBy', 'limit', 'page'])

  options.populate = [{ path : 'kol' }, { path : 'kolCode' }, { path : 'catSummary', populate : { path : 'category' } }]


  const sales = await salesService.getKolSalesByMonth(filter, options)
  return res.send(sales)
})

const regenerateKolSales = catchAsync(async (req, res) => {
  await kolMonthlySales(req.query.date)
  return res.send({})
})


const myKolSales = catchAsync(async (req, res) => {
  const filter = { kol : req.user.id }
  const options = pick(req.query, ['sortBy', 'limit', 'page'])
  options.populate = [{ path : 'catSummary', populate : { path : 'category' } }]
  const sales = await salesService.getKolSalesByMonth(filter, options)
  return res.send(sales)
})

const deleteKolSales = catchAsync(async (req, res) => {
  await salesService.deleteKolSalesById(req.params.kolSalesId)
  res.status(httpStatus.NO_CONTENT).send()
})


const getKolSalesDetail = catchAsync(async (req, res) => {
  const populate = [{ path : 'kol' }, { path : 'kolCode' }, { path : 'ordersRef', populate : { path : 'items', populate : { path : 'product' } } },
    { path : 'ordersRef', populate : { path : 'voucherUsed' } },
    { path : 'catSummary', populate : { path : 'category' } }, { path : 'settlement' }]
  const sales = await salesService.getKolSalesById(req.params.kolSalesId, populate)
  return res.send(sales)
})

const updateKolSales = catchAsync(async (req, res) => {
  const body = _.pick(req.body, ['settlement'])
  const sales = await salesService.updateKolSalesById(req.params.kolSalesId, body)
  return res.send(sales)
})

module.exports = {
  getSales,
  getKolSales,
  getKolSalesDetail,
  updateKolSales,
  myKolSales,
  regenerateKolSales,
  deleteKolSales,
  getTopupSales
}
