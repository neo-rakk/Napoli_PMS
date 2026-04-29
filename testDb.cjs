const db = require('./server/db/database.cjs');

async function test() {
  const clients = await db.all("SELECT * FROM clients");
  console.log('CLIENTS:', clients);
  
  const groupes = await db.all("SELECT * FROM groupes");
  console.log('GROUPES:', groupes);
  
  process.exit(0);
}
test();
