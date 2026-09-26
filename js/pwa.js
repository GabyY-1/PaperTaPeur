(() => {
  const installBtn = document.getElementById("installAppBtn");
  const platformLabel = document.getElementById("platformLabel");
  let deferredPrompt = null;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (platformLabel) platformLabel.textContent = standalone ? "APP INSTALLÉE" : mobile ? "TÉLÉPHONE" : "ORDINATEUR";

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        // On mobile browser, remove stale workers first to avoid frozen old builds.
        if (mobile && !standalone) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(reg => reg.unregister()));
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.filter(k => k.startsWith("papertapeur-")).map(k => caches.delete(k)));
          }
          return;
        }

        await navigator.serviceWorker.register("./sw.js?v=3");
      } catch (error) {
        console.warn("Service worker disabled:", error);
      }
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

    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      alert("Sur iPhone/iPad : menu Partager de Safari → Sur l’écran d’accueil.");
    } else {
      alert("Dans Chrome/Edge : menu du navigateur → Installer PaperTaPeur.");
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get("open") === "multiplayer") {
    window.addEventListener("load", () => document.getElementById("openMultiplayerBtn")?.click());
  }
})();