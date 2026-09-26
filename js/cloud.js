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

  async function saveMatch({ territory, kills, coinsEarned, rankDelta, mapId = "arena" }) {
    const current = await session();
    if (!current) return false;

    const { error } = await client.from("match_history").insert({
      user_id: current.user.id,
      territory: Math.max(0, Number(territory || 0)),
      kills: Math.max(0, Math.round(kills || 0)),
      coins_earned: Math.round(coinsEarned || 0),
      rank_delta: Math.round(rankDelta || 0),
      map_id: mapId
    });

    if (error) throw error;
    return true;
  }

  async function saveMapRecord({ mapId, username, territory, kills }) {
    const current = await session();
    if (!current) return false;

    const { data: existing, error: readError } = await client
      .from("map_records")
      .select("best_territory,best_kills,games")
      .eq("user_id", current.user.id)
      .eq("map_id", mapId)
      .maybeSingle();

    if (readError) throw readError;

    const payload = {
      user_id: current.user.id,
      map_id: mapId,
      username: (username || "Player").slice(0, 14),
      best_territory: Math.max(Number(existing?.best_territory || 0), Number(territory || 0)),
      best_kills: Math.max(Number(existing?.best_kills || 0), Math.round(kills || 0)),
      games: Number(existing?.games || 0) + 1,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from("map_records")
      .upsert(payload, { onConflict: "user_id,map_id" });

    if (error) throw error;
    return true;
  }

  async function getMapLeaderboard(mapId, limit = 10) {
    const { data, error } = await client
      .from("map_records")
      .select("username,best_territory,best_kills,games,updated_at")
      .eq("map_id", mapId)
      .order("best_territory", { ascending: false })
      .order("best_kills", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
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
    saveMapRecord,
    getMapLeaderboard,
    onAuthChange
  };
})();