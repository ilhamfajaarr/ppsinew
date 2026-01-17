const db = require("./db");

async function login(username, password) {
  const result = await db.query(`
    SELECT * FROM dbo.Admin
    WHERE username='${username}' AND password='${password}'
  `);

  return result.recordset[0];
}

module.exports = { login };
