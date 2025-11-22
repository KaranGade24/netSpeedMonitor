const minimize = document.getElementById("minimize");
const maximize = document.getElementById("maximize");
const close_win = document.getElementById("closeWindow");
const downSpeed = document.getElementById("down-speed");
const upSpeed = document.getElementById("up-speed");

setInterval(() => {
  window.electronAPI.requestUsageLive();
}, 1000);

window.electronAPI.onNetSpeed((speed) => {
  downSpeed.innerText = speed.downloadSpeed;
  upSpeed.innerText = speed.uploadSpeed;
});

window.electronAPI.onNetSpeed((data) => {
  document.getElementById("ip-address").innerText = `IP: ${data.ip}`;
  document.getElementById("ping").innerText = `Ping: ${data.ping}`;

  document.getElementById("ip-health").innerText = `IP: ${data.ip}`;
  document.getElementById("ping-health").innerText = `Ping: ${data.ping}`;

  document.querySelector(
    ".network-health .label"
  ).innerText = `Packet Loss: ${data.packetLoss}`;
});

close_win.addEventListener("click", () => {
  window.electronApi.winClose();
});

minimize.addEventListener("click", () => {
  window.electronApi.minimize();
});

// maximize.addEventListener("click", () => {
//   console.log("click to maximize the window");
//   window.electronApi.maximize();
// });

window.electronAPI.onUsageLive((data) => {
  // DAILY
  document.getElementById("daily-upload").innerText = data.daily.upload;
  document.getElementById("daily-download").innerText = data.daily.download;
  document.getElementById("daily-total").innerText = data.daily.total;

  // MONTHLY
  document.getElementById("monthly-upload").innerText = data.monthly.upload;
  document.getElementById("monthly-download").innerText = data.monthly.download;
  document.getElementById("monthly-total").innerText = data.monthly.total;
});
