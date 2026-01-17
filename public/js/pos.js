let cart = [];
let menuData = [];
let selectedCategory = "all";
let selectedPayment = "";

  

/* ================= LOAD MENU ================= */

async function loadMenu() {
  const res = await fetch("/menu");
  const data = await res.json();
  menuData = data;
  renderMenu();
}

function setCategory(cat) {
  selectedCategory = cat;
  renderMenu();
}

function renderMenu() {
  const container = document.getElementById("menuList");

  const filtered = menuData.filter(m =>
    selectedCategory === "all" || m.kategori === selectedCategory
  );

  container.innerHTML = filtered.map(item => `
    <div class="menu-item">
      <h4>${item.nama_menu}</h4>
      <p>Rp ${item.harga.toLocaleString()}</p>
      <button onclick="addCart(${item.id_menu}, '${item.nama_menu}', ${item.harga})">
        Tambah
      </button>
    </div>
  `).join("");
}

/* ================= CART ================= */

function addCart(id_menu, name, price) {
  const exist = cart.find(i => i.id_menu === id_menu);

  if (exist) {
    exist.qty++;
  } else {
    cart.push({ id_menu, name, harga: price, qty: 1 });
  }

  renderCart();
}

function minus(index) {
  if (cart[index].qty > 1) cart[index].qty--;
  else cart.splice(index, 1);

  renderCart();
}

function renderCart() {
  const body = document.getElementById("cartBody");

  body.innerHTML = cart.map((item, i) => `
    <tr>
      <td>${item.name}</td>
      <td>
        <button onclick="minus(${i})">-</button>
        ${item.qty}
        <button onclick="addCart(${item.id_menu}, '${item.name}', ${item.harga})">+</button>
      </td>
      <td>Rp ${(item.qty * item.harga).toLocaleString()}</td>
    </tr>
  `).join("");

  calc();
}

function calc() {
  const subtotal = cart.reduce((s, i) => s + i.qty * i.harga, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  document.getElementById("subtotal").innerText = subtotal.toLocaleString();
  document.getElementById("tax").innerText = tax.toLocaleString();
  document.getElementById("total").innerText = total.toLocaleString();
}

/* ================= PAYMENT ================= */

function openPayment(type) {
  if (cart.length === 0) {
    alert("Keranjang kosong");
    return;
  }

  selectedPayment = type;
  document.getElementById("paymentModal").classList.remove("hidden");

  document.getElementById("qrisBox").style.display =
    type === "QRIS" ? "block" : "none";
}

function closePayment() {
  document.getElementById("paymentModal").classList.add("hidden");
}

async function checkout() {
  const payload = {
    metode_pembayaran: selectedPayment,
    items: cart.map(item => ({
      id_menu: item.id_menu,
      qty: item.qty,
      harga: item.harga
    }))
  };

  try {
    const res = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      showPopup("Transaksi berhasil! ID: " + data.id_transaksi, "success");
      printStruk(data.id_transaksi, cart);
      cart = [];
      renderCart();
      closePayment();
    } else {
      showPopup("Transaksi gagal!", "error");
    }

  } catch (err) {
    console.error(err);
    showPopup("Server error", "error");
  }
}

/* ================= INIT ================= */
loadMenu();

function logout() {
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

function showPopup(message, type = "info") {
  const popup = document.getElementById("popup");
  const popupMessage = document.getElementById("popup-message");
  popupMessage.textContent = message;
  popupMessage.className = type; // Optional: add class for styling based on type
  popup.style.display = "flex";
  setTimeout(() => {
    closePopup();
  }, 3000); // Auto close after 3 seconds
}

function closePopup() {
  const popup = document.getElementById("popup");
  popup.style.display = "none";
}

function printStruk(idTransaksi, cartItems) {
  // Fill struk details
  document.getElementById("struk-id").textContent = idTransaksi;
  document.getElementById("struk-date").textContent = new Date().toLocaleString("id-ID");

  const strukBody = document.getElementById("struk-body");
  strukBody.innerHTML = "";

  let subtotal = 0;
  cartItems.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.nama_menu || 'Unknown'}</td>
      <td>${item.qty}</td>
      <td>${item.harga}</td>
      <td>${item.qty * item.harga}</td>
    `;
    strukBody.appendChild(row);
    subtotal += item.qty * item.harga;
  });

  const ppn = subtotal * 0.1;
  const total = subtotal + ppn;

  document.getElementById("struk-subtotal").textContent = subtotal.toLocaleString("id-ID");
  document.getElementById("struk-ppn").textContent = ppn.toLocaleString("id-ID");
  document.getElementById("struk-total").textContent = total.toLocaleString("id-ID");

  // Show struk and print
  const struk = document.getElementById('struk');
  struk.style.display = 'block';
  window.print();
  struk.style.display = 'none';
}
