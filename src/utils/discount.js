const { categoryService, voucherService } = require("../services")
const _ = require('lodash')
const ApiError = require("./ApiError")
const httpStatus = require('http-status')
const moment = require('moment')

const resolveProductUnitPrice = (product, vipTier) => {
  if (['gold', 'diamond'].includes(vipTier) && product.vipPrice > 0) {
    return product.vipPrice
  }
  return product.discountPrice || product.price
}

const voucherAdopted = async function (code, paidTotal, user, totalItems, total) {
  const voucher = await voucherService.validateVoucherByCode(code)
  if (voucher.code === 'STUDENT') {
    if (!user || !user.isStudent) {
      throw new ApiError(httpStatus.BAD_REQUEST, '優惠碼只供學生使用')
    } else {
      if (user.isStudent) {
        if (user.student.status !== 'approved') {
          throw new ApiError(httpStatus.BAD_REQUEST, '學生身份未通過，STUDENT優惠碼未能使用！')
        }

        if (user.student.status === 'approved') {
          if (!moment().isBefore(moment(user.student.endAt))) {
            throw new ApiError(httpStatus.BAD_REQUEST, '學生身份已完結，STUDENT優惠碼不能使用！')
          }
        }
      }
    }
  }

  if (voucher) {
    if (totalItems < voucher.moq) throw new ApiError(httpStatus.BAD_REQUEST, `優惠碼「${ voucher.code }」最低購買量為${ voucher.moq }件`)
    if (total < voucher.mov) throw new ApiError(httpStatus.BAD_REQUEST, `優惠碼「${ voucher.code }」最低銷費為: $${ voucher.mov }`)
    let value = 0
    //fixed discount¡
    if (voucher.type === 'fixed') {
      value = voucher.value
      if (paidTotal + value < 20) {
        value = (paidTotal - 20) * -1
      }
    }

    //percent discount
    if (voucher.type === 'percent') {
      value = Math.floor(paidTotal * voucher.value / 100)
    }

    //buy x get y free discount
    if (voucher.type === 'buyXGetYFree') {
      // TBC
      value = 0
    }

    // update voucher usage
    // await voucherService.useVoucher(voucher.id)

    return { voucherUsed : voucher.id, voucherDiscountTotal : value }
  }
  return null
}

const autoDiscountTiersAdopted = async function ({ items }) {
  // 1. group cart quantities and build product map by product id
  const itemQtyByProduct = {}
  const productMap = {}
  items.forEach(item => {
    const productId = item.product._id.toString()
    if (!itemQtyByProduct[productId]) itemQtyByProduct[productId] = 0
    itemQtyByProduct[productId] += item.quantity
    productMap[productId] = item.product
  })

  // 2. compute discount tiers per product
  const tiers = {}
  _.forOwn(itemQtyByProduct, (qty, productId) => {
    const product = productMap[productId]
    if (!product.discountTierEnabled || !product.discount || !product.discount.length) return

    const sorted = _.orderBy(product.discount, ['quantity'])
    let completedTier = null
    const nextTier = []
    sorted.forEach(discountObj => {
      if (qty >= discountObj.quantity) {
        completedTier = { ...discountObj.toJSON(), current : qty }
      }
      if (qty < discountObj.quantity) {
        nextTier.push({ ...discountObj.toJSON(), current : qty })
      }
    })
    tiers[productId] = { completedTier, nextTier }
  })

  // 3. get discount total
  const tiersAdopted = Object.values(tiers)
  const discountTotal = _.sumBy(tiersAdopted, function ({ completedTier }) {
    return completedTier ? completedTier.value * completedTier.current : 0
  })

  // 4. discount object in order, type & description
  const autoDiscountAdopted = Object.keys(tiers).map((productId) => {
    const tier = tiers[productId]
    if (tier.completedTier) {
      return {
        discountType : 'productDiscount',
        desc         : `${ productMap[productId].name.zh }：滿${ tier.completedTier.quantity }件每件減$${ tier.completedTier.value * -1 }`
      }
    }
    return {}
  })

  if (discountTotal) {
    return { discountTotal, autoDiscountAdopted }
  }
  return null

}

const autoBuyXGetYFreeAdopted = async function ({ items }, { vipTier } = {}) {
  // 1. construct category discount object
  const categoriesWithProducts = await categoryService.queryCategories({}, {})
  const buyXGetYFree = {}
  if (categoriesWithProducts.results && categoriesWithProducts.results.length) {
    categoriesWithProducts.results.forEach(cat => {
      if (cat.buyXGetYFreeEnabled && cat.buyXGetYFree && cat.buyXGetYFree.length) {
        buyXGetYFree[cat.id] = { buyXGetYFree : cat.buyXGetYFree, name : cat.name }
      }
    })
  }

  // 2. get discounts adopted
  const tiers = {}
  const itemQtyInOrderByCat = {}
  items.forEach(item => {
    const cat = item.product.category
    if (!itemQtyInOrderByCat[cat]) itemQtyInOrderByCat[cat] = 0
    itemQtyInOrderByCat[cat] += item.quantity
  })

  // 3. loop through itemQtyInOrderByCat
  _.forOwn(itemQtyInOrderByCat, (qty, catId) => {
    // if category discount exists
    let _buyXGetYFree = _.clone(buyXGetYFree[catId])
    const nextTier = []
    if (_buyXGetYFree) {
      _buyXGetYFree.buyXGetYFree = _.orderBy(_buyXGetYFree.buyXGetYFree, ['x'])
      let completedTier = null
      let nextTier = []
      _buyXGetYFree.buyXGetYFree.forEach(discountObj => {
        // completed tier
        const requiredQty = discountObj.x + discountObj.y
        if (qty >= requiredQty) {
          completedTier = { ...discountObj.toJSON(), current : qty }
        }

        // closest next tier
        if (qty < requiredQty) {
          nextTier.push({ ...discountObj.toJSON(), current : qty })
        }

      })
      tiers[catId] = { completedTier, nextTier }
    }
  })

  // 4. get discount total && desc done
  let buyXGetYFreeDiscountTotal = 0
  let buyXGetYFreeAdopted = []
  for (let catId in tiers) {
    const completedTier = tiers[catId].completedTier
    if (completedTier) {
      const result = getBuyXGetYFreeDiscount(completedTier, catId, items, vipTier)
      if (result) {
        buyXGetYFreeDiscountTotal += result.total
        buyXGetYFreeAdopted.push({
            discountType : 'buyXGetYFreeDiscount',
            desc         : `${ buyXGetYFree[catId].name.zh }：買${ completedTier.x }送${ completedTier.y }`,
            freeItems    : result.freeItems.map(item => ({ product : item._id, sellingPrice : item.sellingPrice })),
          }
        )
      }
    }
  }

  if (buyXGetYFreeDiscountTotal) {
    return { buyXGetYFreeDiscountTotal, buyXGetYFreeAdopted }
  } else {
    return null
  }
}

const getBuyXGetYFreeDiscount = (completedTier, catId, _items, vipTier) => {
  if (!completedTier || !catId || !_items) {
    return 0
  }

  const freeQty = Math.floor(completedTier.current / (completedTier.x + completedTier.y)) * completedTier.y
  let itemTable = []
  const items = _items.filter(item => item.product.category.toString() === catId)

  items.forEach(item => {
    const product = item.product._doc
    const sellingPrice = resolveProductUnitPrice(product, vipTier)
    const _item = { ...product, sellingPrice }
    const fillItems = Array(item.quantity).fill(_item)
    itemTable = itemTable.concat(fillItems)
  })

  itemTable.sort((a, b) => {
    return a.sellingPrice - b.sellingPrice
  })


  const freeItems = _.slice(itemTable, 0, freeQty)
  return { total : _.sumBy(freeItems, 'sellingPrice') * -1, freeItems }
}

module.exports = {
  autoDiscountTiersAdopted,
  voucherAdopted,
  autoBuyXGetYFreeAdopted
}
