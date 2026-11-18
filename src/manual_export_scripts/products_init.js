const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Category, User, Product } = require("../models");
const path = require("path");
const csvtojson = require('csvtojson');

dotenv.config({ path : path.join(__dirname, '../../.env') });

/**
 * Build combined category name from categoryGroupZh + categoryZh.
 * e.g. "優質豬類" + "日本豬類" → { zh: "優質豬類|日本豬類", en: "Quality Pork|Japan Pork" }
 * If one side is empty, return the non-empty side only (no pipe).
 */
function parseCategoryName(row) {
  const catZh   = (row.categoryZh || '').trim();
  const catEn   = (row.categoryEn || '').trim();

  if (catZh)            return { zh : catZh,   en : catEn };
  return null;
}

/**
 * Parse productPrice field.
 * "138|98"  → { price: 138, discountPrice: 98 }
 * "88"      → { price: 88,  discountPrice: 0 }
 * "68|100g" → { price: 68,  discountPrice: 0 }  (non-numeric second part ignored)
 */
function parsePrice(raw) {
  const parts       = String(raw || '').split('|');
  const price       = parseFloat(parts[0]);
  const discountRaw = parts[1] ? parseFloat(parts[1]) : NaN;
  return {
    price         : isNaN(price) ? 0 : price,
    discountPrice : isNaN(discountRaw) ? 0 : discountRaw,
  };
}

/**
 * Parse tiers field.
 * "2|-5" → { discount: [{ quantity: 2, value: -5 }], discountTierEnabled: true }
 * ""     → { discount: [],                            discountTierEnabled: false }
 */
function parseTiers(raw) {
  if (!raw || !String(raw).trim()) return { discount : [], discountTierEnabled : false };
  const parts    = String(raw).trim().split('|');
  const quantity = parseInt(parts[0]);
  const value    = parseInt(parts[1]);
  if (parts.length !== 2 || isNaN(quantity) || isNaN(value)) {
    return { discount : [], discountTierEnabled : false };
  }
  return { discount : [{ quantity, value }], discountTierEnabled : true };
}

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex     : true,
  useNewUrlParser    : true,
  useUnifiedTopology : true,
  useFindAndModify   : false,
}).then(async () => {
  console.info('Connected to MongoDB');

  await (async function () {
    // 1. Upsert super user
    const userData = {
      name            : 'super',
      vipTier         : 'diamond',
      email           : 'yunerskin@gmail.com',
      password        : 'Yunerksin2026$',
      role            : 'super',
      gender          : 'm',
      isEmailVerified : true,
    };
    let user = await User.findOne({ email : userData.email });
    if (!user) {
      user = await User.create(userData);
      console.log('Created user:', user.email);
    } else {
      console.log('User exists:', user.email);
    }

    // 2. Read CSV
   /* const csvFilePath = './products_init.csv';
    const rows = await csvtojson().fromFile(csvFilePath);

    // 3. Collect unique categories (key = combined zh name)
    const categoryMap = {}; // zhKey → { zh, en }
    for (const row of rows) {
      const cat = parseCategoryName(row);
      if (cat && !categoryMap[cat.zh]) {
        categoryMap[cat.zh] = cat;
      }
    }

    // 4. Import all categories first, build zhKey → _id map
    const categoryIdMap = {}; // zhKey → ObjectId
    for (const zhKey of Object.keys(categoryMap)) {
      const cat   = categoryMap[zhKey];
      let   dbCat = await Category.findOne({ 'name.zh' : cat.zh });
      if (!dbCat) {
        dbCat = await Category.create({
          name                : { zh : cat.zh, en : cat.en },
          slogan              : {
            zh : '無抗生素，不含味精，不含防腐，每日新鮮香港制造。',
            en : 'No antibiotics, no MSG, no preservatives, fresh daily made in Hong Kong.',
          },
          publish             : true,
          buyXGetYFreeEnabled : false,
        });
        console.log('Created category:', cat.zh);
      } else {
        console.log('Category exists:', cat.zh);
      }
      categoryIdMap[zhKey] = dbCat._id;
    }

    // 5. Import products (skip existing by productId)
    for (const row of rows) {
      const existing = await Product.findOne({ productId : row.productId });
      if (existing) {
        console.log('Product exists, skipping:', row.productId);
        continue;
      }

      const cat                               = parseCategoryName(row);
      const categoryId                        = cat ? categoryIdMap[cat.zh] : null;
      const { price, discountPrice }          = parsePrice(row.productPrice);
      const { discount, discountTierEnabled } = parseTiers(row.tiers);

      const model = {
        productId           : row.productId,
        category            : categoryId || null,
        description         : { zh : row.productNameZh, en : row.productNameEn },
        madeIn              : { zh : '--', en : '--' },
        addons              : [],
        soldOut             : false,
        images              : [],
        publish             : true,
        featured            : false,
        internalName        : row.productId,
        name                : { zh : row.productNameZh, en : row.productNameEn },
        price,
        discountPrice,
        discount,
        discountTierEnabled,
        createdBy           : user._id,
        lastEditBy          : user._id,
        archive             : false,
        isBundled           : false,
      };

      await Product.create(model);
      console.log('Created product:', row.productId, '-', row.productNameEn);
    }*/

    console.log('✅ Import complete.');
  })();

  await mongoose.disconnect();
  process.exit();
});
