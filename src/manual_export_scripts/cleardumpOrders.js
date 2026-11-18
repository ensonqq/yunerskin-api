const { MongoClient } = require('mongodb');

async function clearCollection () {
  const uri = "mongodb://127.0.0.1:27017";
  const client = new MongoClient(uri, { useUnifiedTopology : true });

  try {
    await client.connect();
    const database = client.db("yunerksin");
    const collection = database.collection("orders");

    // Passing an empty object {} matches and deletes every document
    const result = await collection.deleteMany({});

    console.log(`Successfully cleared the collection.`);
    console.log(`Deleted ${ result.deletedCount } documents.`);
  } finally {
    await client.close();
  }
}

clearCollection().catch(console.error);
