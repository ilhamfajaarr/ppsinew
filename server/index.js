const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./db");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= STATIC FRONTEND ================= */
app.use(express.static(path.join(__dirname, "..", "public")));

/* ================= ROUTES ================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.pool.request()
      .input("username", username)
      .input("password", password)
      .query(`
        SELECT id_admin, username
        FROM Admin
        WHERE username = @username AND password = @password
      `);

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        username: result.recordset[0].username
      });
    } else {
      res.json({ success: false });
    }

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/menu", async (req, res) => {
  try {
    const result = await db.pool.request().query(`
      SELECT id_menu, nama_menu, harga, kategori
      FROM dbo.Menu
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("MENU ERROR:", err);
    res.status(500).send("Server error");
  }
});

app.post("/checkout", async (req, res) => {
  const { metode_pembayaran, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false });
  }

  const transaction = db.pool.transaction();
  const totalBayar = items.reduce(
    (sum, i) => sum + i.qty * i.harga,
    0
  );

  try {
    await transaction.begin();

    const pembayaran = await transaction.request().query(`
      INSERT INTO Pembayaran (metode_pembayaran, total_bayar)
      VALUES ('${metode_pembayaran}', ${totalBayar});

      SELECT SCOPE_IDENTITY() AS id_transaksi;
    `);

    const id_transaksi = pembayaran.recordset[0].id_transaksi;

    for (const item of items) {
      await transaction.request().query(`
        INSERT INTO Pesanan
        (id_transaksi, id_menu, qty, total_harga, status)
        VALUES (
          ${id_transaksi},
          ${item.id_menu},
          ${item.qty},
          ${item.qty * item.harga},
          'selesai'
        )
      `);
    }

    await transaction.commit();
    res.json({ success: true, id_transaksi });

  } catch (err) {
    await transaction.rollback();
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/reports", async (req, res) => {
  const { from, to, product, tid } = req.query;

  try {
    let where = "WHERE 1=1";
    if (from) where += ` AND CAST(py.tanggal AS DATE) >= '${from}'`;
    if (to) where += ` AND CAST(py.tanggal AS DATE) <= '${to}'`;
    if (product) where += ` AND m.nama_menu LIKE '%${product}%'`;
    if (tid) where += ` AND py.id_transaksi = ${tid}`;

    const result = await db.pool.request().query(`
      SELECT
        DATEADD(hour, -7, py.tanggal) AS tanggal,
        py.id_transaksi AS id_transaksi,
        m.nama_menu AS produk,
        ps.qty AS qty,
        m.harga AS harga,
        (ps.qty * m.harga) AS total
      FROM Pembayaran py
      JOIN Pesanan ps ON py.id_transaksi = ps.id_transaksi
      JOIN Menu m ON ps.id_menu = m.id_menu
      ${where}
      ORDER BY py.tanggal DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json([]);
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
