const { MongoClient } = require('mongodb');

async function updateImageHosts () {
  const uri = "mongodb://127.0.0.1:27017";
  const client = new MongoClient(uri, { useUnifiedTopology : true });

  try {
    await client.connect();
    const database = client.db("yunerksin");
    const collection = database.collection("images");

    // Define your old and new prefixes
    const oldPrefix = "https://api-dev.yunerksin.com.hk";
    const newPrefix = "https://api.yunerksin.com.hk";

    const result = await collection.updateMany(
      // 1. Filter: Only match documents where the image URL starts with the old prefix
      { 'small.path' : { $regex : `^${ oldPrefix }` } },

      // 2. Update Pipeline: Use aggregation to replace the string dynamically
      [
        {
          $set : {
            'small.path' : {
              $replaceOne : {
                input       : "$small.path",
                find        : oldPrefix,
                replacement : newPrefix
              }
            }
          }
        },
        {
          $set : {
            'medium.path' : {
              $replaceOne : {
                input       : "$medium.path",
                find        : oldPrefix,
                replacement : newPrefix
              }
            }
          }
        },
        {
          $set : {
            'large.path' : {
              $replaceOne : {
                input       : "$large.path",
                find        : oldPrefix,
                replacement : newPrefix
              }
            }
          }
        }
      ]
    );

    console.log(`Matched ${ result.matchedCount } documents.`);
    console.log(`Updated ${ result.modifiedCount } documents.`);
  } finally {
    await client.close();
  }
}

updateImageHosts().catch(console.error);
