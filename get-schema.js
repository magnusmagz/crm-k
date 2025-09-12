const { sequelize } = require('./backend/models');

async function getFullSchema() {
  try {
    const [results] = await sequelize.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, column_name
    `);
    
    const tables = {};
    results.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push(row.column_name);
    });
    
    console.log('=== COMPLETE DATABASE SCHEMA ===\n');
    Object.keys(tables).sort().forEach(tableName => {
      console.log(`${tableName}:`);
      tables[tableName].forEach(col => console.log(`  - ${col}`));
      console.log();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

getFullSchema();