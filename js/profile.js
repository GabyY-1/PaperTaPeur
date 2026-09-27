(() => {
  const STORAGE_KEY = "ptpProfileV1";

  const RANKS = [
    { name: "Bronze", tier: "III", min: 0, color: "#b77948" },
    { name: "Bronze", tier: "II", min: 250, color: "#b77948" },
    { name: "Bronze", tier: "I", min: 500, color: "#b77948" },

    { name: "Argent", tier: "III", min: 800, color: "#b9c3cb" },
    { name: "Argent", tier: "II", min: 1200, color: "#b9c3cb" },
    { name: "Argent", tier: "I", min: 1600, color: "#b9c3cb" },

    { name: "Or", tier: "III", min: 2200, color: "#f1bf36" },
    { name: "Or", tier: "II", min: 2800, color: "#f1bf36" },
    { name: "Or", tier: "I", min: 3400, color: "#f1bf36" },

    { name: "Platine", tier: "III", min: 4200, color: "#70d2cf" },
    { name: "Platine", tier: "II", min: 5000, color: "#70d2cf" },
    { name: "Platine", tier: "I", min: 5800, color: "#70d2cf" },

    { name: "Diamant", tier: "III", min: 7000, color: "#6fa8ff" },
    { name: "Diamant", tier: "II", min: 8200, color: "#6fa8ff" },
    { name: "Diamant", tier: "I", min: 9400, color: "#6fa8ff" },

    { name: "Maître", tier: "III", min: 11000, color: "#a66cff" },
    { name: "Maître", tier: "II", min: 12500, color: "#a66cff" },
    { name: "Maître", tier: "I", min: 14000, color: "#a66cff" },

    { name: "Champion", tier: "III", min: 16000, color: "#ff5577" },
    { name: "Champion", tier: "II", min: 18000, color: "#ff5577" },
    { name: "Champion", tier: "I", min: 20000, color: "#ff5577" },

    { name: "TaPeur", tier: "", min: 25000, color: "#ff2d55" }
  ];  const defaults = {
    id: "",
    name: "Player",
    createdAt: 0,
    rankPoints: 0,
    level: 1,
    xp: 0,
    games: 0,
    totalKills: 0,
    bestTerritory: 0,
    coins: 0
  };

  function makeId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return "ptp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const profile = { ...defaults, ...(raw || {}) };
      if (!profile.id) profile.id = makeId();
      if (!profile.createdAt) profile.createdAt = Date.now();
      save(profile);
      return profile;
    } catch {
      const profile = { ...defaults, id: makeId(), createdAt: Date.now() };
      save(profile);
      return profile;
    }
  }

  function save(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  function getRank(points) {
    let rank = RANKS[0];
    for (const candidate of RANKS) {
      if (points >= candidate.min) rank = candidate;
    }

    const index = RANKS.indexOf(rank);
    const next = RANKS[index + 1] || null;
    const progress = next
      ? Math.max(0, Math.min(1, (points - rank.min) / (next.min - rank.min)))
      : 1;

    return {
      ...rank,
      fullName: rank.tier ? rank.name + " " + rank.tier : rank.name,
      index,
      next,
      progress
    };
  }

  function botDifficulty(points) {
    const rank = getRank(points);
    const tierBase = rank.index / (RANKS.length - 1);
    const within = rank.progress;
    return Math.max(0.2, Math.min(1, 0.2 + tierBase * 0.67 + within * 0.13));
  }

  function rankDelta(percent, kills) {
    const performance = percent * 1.9 + kills * 9;
    return Math.round(Math.max(-18, Math.min(80, performance - 18)));
  }

  function recordMatch(profile, { territory, kills }) {
    const delta = rankDelta(territory, kills);

    profile.rankPoints = Math.max(0, profile.rankPoints + delta);
    profile.games += 1;
    profile.totalKills += kills;
    profile.bestTerritory = Math.max(profile.bestTerritory, territory);

    const xpGain = Math.max(20, Math.round(territory * 8 + kills * 25 + 20));
    profile.xp += xpGain;

    while (profile.xp >= profile.level * 180) {
      profile.xp -= profile.level * 180;
      profile.level += 1;
    }

    save(profile);

    return {
      delta,
      xpGain,
      rank: getRank(profile.rankPoints)
    };
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return load();
  }

  window.PTPProfile = {
    load,
    save,
    reset,
    getRank,
    botDifficulty,
    recordMatch,
    RANKS
  };
})();