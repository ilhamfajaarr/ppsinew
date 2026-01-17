document.getElementById("btnLogin").addEventListener("click", async ()=>{
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/login", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });

  const data = await res.json();

  if (data.success) {

    localStorage.setItem("username", data.username);

    if (data.username === "admin") {
      window.location.href = "pos.html";
    } else if (data.username === "owner") {
      window.location.href = "reports.html";
    } 

  } else {
    alert("Login gagal");
  }
});

