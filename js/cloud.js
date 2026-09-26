(() => {
  const SUPABASE_URL = "https://ylsftadpiefbzwvcqlbs.supabase.co";
  const SUPABASE_KEY = "sb_publishable_LF7cf0G6HOnp5g2fDWH-Jg_aVvk7lYr";

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function mapCloudProfile(row) {
    if (!row) return null;
    return {
      name: row.username || "Player",
      rankPoints: Number(row.rank_points || 0),
      level: Number(row.level || 1),
      xp: Number(row.xp || 0),
      games: Number(row.games || 0),
      totalKills: Number(row.total_kills || 0),
      bestTerritory: Number(row.best_territory || 0),
      coins: Number(row.coins || 0),
      selectedColor: row.selected_color || "#ffd84d"
    };
  }

  async function session() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function signUp(email, password, username) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username: (username || "Player").slice(0, 14) }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function getProfile() {
    const current = await session();
    if (!current) return null;

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", current.user.id)
      .single();

    if (error) throw error;
    return mapCloudProfile(data);
  }

  async function saveProfile(profile, selectedColor, coins) {
    const current = await session();
    if (!current) return false;

    const payload = {
      user_id: current.user.id,
      username: (profile.name || "Player").slice(0, 14),
      rank_points: Math.max(0, Math.round(profile.rankPoints || 0)),
      level: Math.max(1, Math.round(profile.level || 1)),
      xp: Math.max(0, Math.round(profile.xp || 0)),
      games: Math.max(0, Math.round(profile.games || 0)),
      total_kills: Math.max(0, Math.round(profile.totalKills || 0)),
      best_territory: Math.max(0, Number(profile.bestTerritory || 0)),
      coins: Math.max(0, Math.round(coins ?? profile.coins ?? 0)),
      selected_color: selectedColor || "#ffd84d"
    };

    const { error } = await client.from("profiles").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    return true;
  }

  async function mergeOnLogin(localProfile, selectedColor, localCoins) {
    const cloud = await getProfile();

    if (!cloud) return { profile: localProfile, selectedColor, coins: localCoins };

    const cloudIsFresh =
      cloud.games === 0 &&
      cloud.totalKills === 0 &&
      cloud.rankPoints === 0 &&
      cloud.coins === 0 &&
      cloud.bestTerritory === 0;

    if (cloudIsFresh) {
      await saveProfile(localProfile, selectedColor, localCoins);
      return { profile: localProfile, selectedColor, coins: localCoins };
    }

    const merged = {
      ...localProfile,
      name: cloud.name || localProfile.name,
      rankPoints: cloud.rankPoints,
      level: cloud.level,
      xp: cloud.xp,
      games: cloud.games,
      totalKills: cloud.totalKills,
      bestTerritory: cloud.bestTerritory,
      coins: cloud.coins
    };

    return {
      profile: merged,
      selectedColor: cloud.selectedColor || selectedColor,
      coins: cloud.coins
    };
  }

  async function saveMatch({ territory, kills, coinsEarned, rankDelta }) {
    const current = await session();
    if (!current) return false;

    const { error } = await client.from("match_history").insert({
      user_id: current.user.id,
      territory: Math.max(0, Number(territory || 0)),
      kills: Math.max(0, Math.round(kills || 0)),
      coins_earned: Math.round(coinsEarned || 0),
      rank_delta: Math.round(rankDelta || 0)
    });

    if (error) throw error;
    return true;
  }

  function onAuthChange(callback) {
    return client.auth.onAuthStateChange((_event, currentSession) => callback(currentSession));
  }

  window.PTPCloud = {
    client,
    session,
    signUp,
    signIn,
    signOut,
    getProfile,
    saveProfile,
    mergeOnLogin,
    saveMatch,
    onAuthChange
  };
})();