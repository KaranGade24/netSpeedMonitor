const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { startPythonStream, setWindow } = require("./Utilities/getNetwork");

const setupGPU = require("./Utilities/setupGPU");
const getNetworkSpeed = require("./Utilities/getNetwork");
const network = require("./Utilities/getNetwork");
const db = require("./Utilities/db");
const process = require("process");
const {
  getDailyUsage,
  getMonthlyUsage,
  format,
} = require("./Utilities/usageQueries");

//Globel decleration of the main window variable
let win;

if (process.env.ELECTRONMON) {
  require("fs").watch(__dirname + "/main/Utilities", (event, filename) => {
    if (
      filename.endsWith(".db") ||
      filename.endsWith(".db-shm") ||
      filename.endsWith(".db-wal")
    ) {
      // Prevent electronmon reload crash
      event.preventDefault?.();
    }
  });
}

const createWindow = async () => {
  try {
    console.log("win creating...");
    //Creating main window
    win = new BrowserWindow({
      minWidth: 850,
      width: 850,
      maxWidth: 850,
      minHeight: 550,
      height: 550,
      maxHeight: 550,
      frame: false,
      show: false,
      backgroundColor: "#EDF2F6",
      titleBarStyle: "hidden",
      webPreferences: {
        preload: path.join(__dirname, "../preload", "preload.js"),
        nodeIntegration: true,
      },
    });

    //Loading the index.html file as default window

    setWindow(win);

    const htmlPath = path.join(
      app.getAppPath(),
      "Render",
      "mainPage",
      "index.html"
    );
    win.loadFile(htmlPath).catch((err) => console.error("Load error:", err));

    win.once("ready-to-show", () => {
      win.show();
      setTimeout(() => startPythonStream(), 1200);
    });
  } catch (error) {
    console.error("error in creing window", error);
  }
};

try {
  ipcMain.on("window-minimize", () => {
    win.minimize();
    console.log("window-minimize window...");
  });

  // ipcMain.on("window-maximize", () =>
  //   win.isMaximized() ? win.unmaximize() : win.maximize()
  // );

  // `get-net-speed` was previously trying to call a non-exported API.
  // Leave a simple reply so older renderer calls do not crash the app.
  ipcMain.on("get-net-speed", async (e) => {
    e.reply("net-speed-data", { error: "not-implemented" });
  });

  ipcMain.on("window-close", () => {
   try{ if (win) {
      // make sure the window exists
      win.close(); // close it
      win = null; // free reference
      db.close();
    }}catch(err){
     console.error(err);
   } finally {

     db.close((eer) => {
      console.log("error insave data: ",err);
    });
  }
  });

  ipcMain.on("get-usage-live", async (event) => {
    getDailyUsage((err, daily) => {
      if (err) return;

      getMonthlyUsage((err2, monthly) => {
        if (err2) return;

        event.reply("usage-live-data", {
          daily: {
            upload: format(daily.upload),
            download: format(daily.download),
            total: format(daily.total),
          },
          monthly: {
            upload: format(monthly.upload),
            download: format(monthly.download),
            total: format(monthly.total),
          },
        });
      });
    });
  });
} catch (error) {
  console.error("error to listen window close event", error);
}
app.on("will-finish-launching", async () => {
  // for rendering the electron app for the older hardwere and os like <= win 7 and other older version
  await setupGPU(app);
});

app.on("ready", async () => {
  console.info("app is ready: ", app.isReady());
  await createWindow();
});

app.on("before-quit", () => {
  try {
    // close sqlite DB
    db.close((err) => {
      if (err) console.error("Error closing DB:", err);
      else console.info("DB closed.");
    });
  } catch (e) {
    console.warn("DB close error:", e);
  } finally {
    db.close((err) => {
      if (err) console.error("Error closing DB:", err);
      else console.info("DB closed.");
    });
  }
});

app.on("quit", (e) => {
  console.info("app is quiting...");
});
