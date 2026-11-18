/**
 * migrate_category_slugs.js
 *
 * One-off migration script that:
 *   1. Strips old "Group|" prefix from category name.en and name.zh
 *   2. Generates a unique URL-safe slug from the cleaned name.en
 *
 * Safe to re-run:
 *   - Names are only cleaned if they still contain a "|"
 *   - Slugs are only generated if the category has no slug yet
 *
 * Usage:
 *   node src/manual_export_scripts/migrate_category_slugs.js           # live run
 *   node src/manual_export_scripts/migrate_category_slugs.js --dry-run # preview only
 */

const dotenv   = require('dotenv');
const mongoose = require('mongoose');
const path     = require('path');
const { Category } = require('../models');

dotenv.config({ path : path.join(__dirname, '../../.env') });

const isDryRun = process.argv.includes('--dry-run');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip group prefix before the last "|".
 * "Chicken|BBQ Chicken" → "BBQ Chicken"
 * "BBQ Chicken"         → "BBQ Chicken"  (unchanged)
 */
function stripGroupPrefix(text) {
  if (!text) return text;
  return text.includes('|') ? text.split('|').pop().trim() : text;
}

/**
 * Convert a string to a URL-safe slug base.
 * e.g. "BBQ Chicken" → "bbq-chicken"
 */
function toBaseSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Find a unique slug in the DB, avoiding collisions with already-used slugs
 * from this migration run. Suffix pattern: base, base-1, base-2, ...
 */
async function findUniqueSlug(base, excludeId, usedThisRun) {
  let slug    = base;
  let counter = 1;

  while (
    usedThisRun.has(slug) ||
    (await Category.findOne({ slug, _id : { $ne : excludeId } }).lean())
  ) {
    slug = `${ base }-${ counter }`;
    counter++;
  }

  return slug;
}

// ─── Main ────────────────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URL, {
  useCreateIndex     : true,
  useNewUrlParser    : true,
  useUnifiedTopology : true,
  useFindAndModify   : false,
}).then(async () => {
  console.info(`✅  Connected to MongoDB${ isDryRun ? '  [DRY RUN — no changes will be saved]' : '' }\n`);

  // Fetch all categories — we need to check names and slugs
  const categories = await Category.find({}).lean();

  if (categories.length === 0) {
    console.log('No categories found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Found ${ categories.length } categorie(s) total.\n`);

  const usedSlugsThisRun = new Set();
  // Pre-load slugs that already exist so we don't collide with them
  const existingSlugs = categories
    .filter(c => c.slug)
    .map(c => c.slug);
  existingSlugs.forEach(s => usedSlugsThisRun.add(s));

  let namesCleaned = 0;
  let slugsCreated = 0;
  let skipped      = 0;

  for (const cat of categories) {
    const $set     = {};
    const needsNameClean = (cat.name?.en && cat.name.en.includes('|')) ||
                           (cat.name?.zh && cat.name.zh.includes('|'));
    const needsSlug      = !cat.slug;

    if (!needsNameClean && !needsSlug) {
      skipped++;
      continue;
    }

    // ── 1. Clean names ───────────────────────────────────────────────────────
    let cleanedEn = cat.name?.en;
    let cleanedZh = cat.name?.zh;

    if (needsNameClean) {
      cleanedEn = stripGroupPrefix(cat.name?.en);
      cleanedZh = stripGroupPrefix(cat.name?.zh);

      $set['name.en'] = cleanedEn;
      $set['name.zh'] = cleanedZh;

      console.log(`  [NAME]  "${ cat.name?.en }" → "${ cleanedEn }"`);
      if (cat.name?.zh !== cleanedZh) {
        console.log(`          "${ cat.name?.zh }" → "${ cleanedZh }"`);
      }
      namesCleaned++;
    }

    // ── 2. Generate slug (from cleaned name) ─────────────────────────────────
    if (needsSlug) {
      const base = toBaseSlug(cleanedEn || cat._id.toString());
      const slug = await findUniqueSlug(base, cat._id, usedSlugsThisRun);

      $set.slug = slug;
      usedSlugsThisRun.add(slug);

      console.log(`  [SLUG]  "${ cleanedEn }"  →  "${ slug }"`);
      slugsCreated++;
    }

    // ── 3. Persist ───────────────────────────────────────────────────────────
    if (!isDryRun && Object.keys($set).length > 0) {
      await Category.updateOne({ _id : cat._id }, { $set });
    }

    console.log('');
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('─'.repeat(50));
  if (isDryRun) {
    console.log('DRY RUN complete — no changes were saved.');
  } else {
    console.log('✅  Migration complete.');
  }
  console.log(`   Names cleaned : ${ namesCleaned }`);
  console.log(`   Slugs created : ${ slugsCreated }`);
  console.log(`   Skipped       : ${ skipped } (already clean)`);
  console.log('─'.repeat(50));

  await mongoose.disconnect();
  process.exit(0);

}).catch((err) => {
  console.error('❌  MongoDB connection error:', err);
  process.exit(1);
});

