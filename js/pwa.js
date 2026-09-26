(() => {
  const installBtn = document.getElementById("installAppBtn");
  const platformLabel = document.getElementById("platformLabel");
  let deferredPrompt = null;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const platform = standalone ? "APP INSTALLÉE" : mobile ? "TÉLÉPHONE" : "ORDINATEUR";

  if (platformLabel) platformLabel.textContent = platform;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.error);
    });
  }

  if (!installBtn) return;

  if (standalone) {
    installBtn.classList.add("hidden");
    return;
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.add("ready");
    installBtn.textContent = "INSTALLER L'APP";
  });

  installBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      alert("Sur iPhone/iPad : ouvre le menu Partager de Safari puis choisis « Sur l’écran d’accueil ».");
    } else {
      alert("Dans Chrome ou Edge, ouvre le menu du navigateur puis choisis « Installer PaperTaPeur » ou « Installer l'application ».");
    }
  });

  window.addEventListener("appinstalled", () => {
    installBtn.classList.add("hidden");
  });

  const params = new URLSearchParams(location.search);
  if (params.get("open") === "multiplayer") {
    window.addEventListener("load", () => {
      document.getElementById("openMultiplayerBtn")?.click();
    });
  }
})();