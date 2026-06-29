const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
db.projects = [];
db.features = [];
db.cards = [];
fs.writeFileSync('database.json', JSON.stringify(db, null, 2));
console.log('Database reset successfully.');
