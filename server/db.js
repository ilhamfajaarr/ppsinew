const sql = require("mssql");



const config = {
  server: "localhost",
  database: "rmpawonjnana",
  user: "sa",
  password: "12345678",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

poolConnect.then(() => {
  console.log("DB Connected!");
}).catch(err => {
  console.log("DB Error: ", err);
});

module.exports = {
  sql,
  pool,
  query: async (queryString) => {
    await poolConnect;
    return pool.request().query(queryString);
  }
};
