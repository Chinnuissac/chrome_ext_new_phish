document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("status");

  fetch("http://127.0.0.1:8000/health")
    .then(res => res.json())
    .then(() => {
      status.innerText = "✅ Backend Connected";
      status.style.color = "green";
    })
    .catch(() => {
      status.innerText = "❌ Backend Not Running";
      status.style.color = "red";
    });
});
