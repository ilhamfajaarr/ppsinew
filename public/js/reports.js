document.getElementById("filterForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = document.getElementById("filterForm");
  const formData = new FormData(form);
  const params = new URLSearchParams(formData);
  history.pushState(null, '', '?' + params.toString());
  loadReports();
});


function resetFilter() {
  window.location.href = "reports.html";
}

async function loadReports() {
  const params = new URLSearchParams(window.location.search);

  const res = await fetch("/reports?" + params.toString());
  const data = await res.json();

  const tbody = document.getElementById("reportBody");
  tbody.innerHTML = "";

  data.forEach(row => {
    tbody.innerHTML += `
      <tr>
        <td>${formatDate(row.tanggal)}</td>
        <td>${row.id_transaksi}</td>
        <td>${row.produk}</td>
        <td>${row.qty}</td>
        <td>${row.harga}</td>
        <td class="total">${row.total}</td>
      </tr>
    `;
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("id-ID");
}

function logout() {
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

async function exportToExcel() {
  const params = new URLSearchParams(window.location.search);

  try {
    const res = await fetch("/reports?" + params.toString());
    const data = await res.json();

    if (data.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    // Prepare data for Excel
    const worksheetData = [
      ["Tanggal", "ID Transaksi", "Produk", "Qty", "Harga", "Total"] // Header
    ];

    data.forEach(row => {
      worksheetData.push([
        formatDate(row.tanggal),
        row.id_transaksi,
        row.produk,
        row.qty,
        row.harga,
        row.total
      ]);
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Transaksi");

    // Generate filename with current date
    const now = new Date();
    const filename = `Laporan_Transaksi_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

  } catch (err) {
    console.error("Export error:", err);
    alert("Gagal mengekspor data.");
  }
}

loadReports();

