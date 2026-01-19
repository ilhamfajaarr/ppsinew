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

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query(
      `SELECT id_admin, username
       FROM admin
       WHERE username = $1 AND password = $2`,
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({
        success: true,
        username: result.rows[0].username
      });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// MENU
app.get("/menu", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id_menu, nama_menu, harga, kategori FROM menu`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("MENU ERROR:", err);
    res.status(500).send("Server error");
  }
});

// CHECKOUT
app.post("/checkout", async (req, res) => {
  const { metode_pembayaran, items } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false });
  }

  const client = await db.pool.connect();

  const totalBayar = items.reduce(
    (sum, i) => sum + i.qty * i.harga,
    0
  );

  try {
    await client.query("BEGIN");

    // PEMBAYARAN
    const pembayaran = await client.query(
      `INSERT INTO pembayaran (metode_pembayaran, total_bayar)
       VALUES ($1, $2)
       RETURNING id_transaksi`,
      [metode_pembayaran, totalBayar]
    );

    const id_transaksi = pembayaran.rows[0].id_transaksi;

    // PESANAN
    for (const item of items) {
      await client.query(
        `INSERT INTO pesanan
         (id_transaksi, id_menu, qty, total_harga, status)
         VALUES ($1, $2, $3, $4, 'selesai')`,
        [
          id_transaksi,
          item.id_menu,
          item.qty,
          item.qty * item.harga
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, id_transaksi });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ success: false });
  } finally {
    client.release();
  }
});

// REPORTS
app.get("/reports", async (req, res) => {
  const { from, to, product, tid } = req.query;

  try {
    let where = "WHERE 1=1";
    const params = [];
    let idx = 1;

    if (from) {
      where += ` AND py.tanggal::date >= $${idx++}`;
      params.push(from);
    }
    if (to) {
      where += ` AND py.tanggal::date <= $${idx++}`;
      params.push(to);
    }
    if (product) {
      where += ` AND m.nama_menu ILIKE $${idx++}`;
      params.push(`%${product}%`);
    }
    if (tid) {
      where += ` AND py.id_transaksi = $${idx++}`;
      params.push(tid);
    }

    const result = await db.query(
      `
      SELECT
        py.tanggal - interval '7 hour' AS tanggal,
        py.id_transaksi,
        m.nama_menu AS produk,
        ps.qty,
        m.harga,
        (ps.qty * m.harga) AS total
      FROM pembayaran py
      JOIN pesanan ps ON py.id_transaksi = ps.id_transaksi
      JOIN menu m ON ps.id_menu = m.id_menu
      ${where}
      ORDER BY py.tanggal DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json([]);
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
