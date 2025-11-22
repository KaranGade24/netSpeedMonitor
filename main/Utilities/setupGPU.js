async function setupGPU(app) {
  const info = await app.getGPUInfo("basic");
  // console.log("gpu info: ", info);

  console.log("Getting GPU info...");

  // If GPU inactive or no modern API supports → disable GPU
  const gpu = info.gpuDevice[0];

  const needToDisable =
    !gpu.active ||
    info.auxAttributes.supportsDx12 === false ||
    info.auxAttributes.supportsVulkan === false ||
    gpu.driverVersion.startsWith("8.") || // Very old Intel drivers
    info.auxAttributes.directComposition === false;

  if (needToDisable) {
    console.log("⚠ GPU not capable → disabling GPU acceleration");
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("disable-gpu");
  } else {
    console.log("✔ GPU OK → using GPU acceleration");
  }
}

module.exports = setupGPU;
