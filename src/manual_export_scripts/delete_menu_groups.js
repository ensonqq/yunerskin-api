/**
 * delete_menu_groups.js
 *
 * One-off cleanup script that:
 *   1. Sets category.group = null for all categories
 *   2. Deletes all CategoryGroup documents
 *   3. Empties MenuOrder so you can manually rebuild it later
 *
 * Safe to re-run:
 *   - categories already with group = null are unchanged
 *   - deleting CategoryGroup docs multiple times is harmless
 *   - MenuOrder is always cleared to an empty list
 *
 * Usage:
 *   node src/manual_export_scripts/delete_menu_groups.js
 *   node src/manual_export_scripts/delete_menu_groups.js --dry-run
 */

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const { Category, CategoryGroup, MenuOrder } = require('../models');

dotenv.config({ path : path.join(__dirname, '../../.env') });

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URL, {
    useCreateIndex     : true,
    useNewUrlParser    : true,
    useUnifiedTopology : true,
    useFindAndModify   : false,
  });

  console.info(`✅ Connected to MongoDB${isDryRun ? ' [DRY RUN]' : ''}\n`);

  const [categories, groups, menuOrderDoc] = await Promise.all([
    Category.find({}).lean(),
    CategoryGroup.find({}).lean(),
    MenuOrder.findOne().lean(),
  ]);

  const groupedCategoryCount = categories.filter((cat) => cat.group).length;
  console.log(`Found ${groups.length} group(s).`);
  console.log(`Found ${groupedCategoryCount} category(ies) with group references.`);
  console.log(`Found ${categories.length} total category(ies).\n`);

  console.log('MenuOrder will be cleared to an empty list.\n');

  if (isDryRun) {
    console.log('Dry run complete. No database changes were made.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const updateResult = await Category.updateMany(
    { group : { $ne : null } },
    { $set : { group : null } }
  );
  const modifiedCount = updateResult.modifiedCount != null ? updateResult.modifiedCount : updateResult.nModified || 0;
  console.log(`Updated ${modifiedCount} category record(s) to group = null.`);

  const deleteResult = await CategoryGroup.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount || 0} category group record(s).`);

  if (menuOrderDoc) {
    await MenuOrder.updateOne(
      { _id : menuOrderDoc._id },
      { $set : { items : [] } }
    );
    console.log('Cleared existing MenuOrder document.');
  } else {
    await MenuOrder.create({ items : [] });
    console.log('Created empty MenuOrder document.');
  }

  console.log('\n✅ Cleanup complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Cleanup failed:', err);
  try {
    await mongoose.disconnect();
  } catch (disconnectErr) {
    // ignore
  }
  process.exit(1);
});

