import { BSON, MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new MongoClient(
  'mongodb://localhost:27017/provider_raw',
);

async function seedDatabase() {
  try {
    await client.connect();

    const db = client.db('provider_raw');

    console.log('✓ Connected to MongoDB');

    const rawDataDir = path.join(__dirname, '../raw_data');

    const files = [
      'locations',
      'restaurants',
      'menus',
    ];

    for (const file of files) {
      const filePath = path.join(
        rawDataDir,
        `compero-xbyte.xbyte-raw-${file}.json`,
      );

      const data = BSON.EJSON.parse(
        fs.readFileSync(filePath, 'utf-8'),
      );

      const collection = db.collection(`xbyte_raw_${file}`);

      await collection.deleteMany({});

      if (data.length > 0) {
        await collection.insertMany(data);
      }

      console.log(`✓ Seeded ${data.length} ${file} records`);
    }

    console.log('✓ Seeding complete!');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedDatabase();
