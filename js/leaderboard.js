// Global scoreboard + comments backed by Supabase REST.
// Zero dependencies — plain fetch, so the game stays a buildless static site.
// Every network call is guarded; if Supabase is unreachable the game plays on offline.
const Leaderboard = (() => {
  const URL = (window.SB_URL || '').replace(/\/$/, '');
  const KEY = window.SB_ANON || '';
  const ready = () => !!(URL && KEY);

  function headers(extra) {
    return Object.assign({
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  // Submit one run. `run` carries public stats + optional comment + private_note.
  async function submit(run) {
    if (!ready()) return false;
    try {
      const res = await fetch(URL + '/rest/v1/scores', {
        method: 'POST',
        headers: headers({ 'Prefer': 'return=minimal' }),
        body: JSON.stringify(run)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Fetch the top runs (by survival time) from the public view.
  async function top(limit = 10) {
    if (!ready()) return [];
    try {
      const res = await fetch(
        URL + '/rest/v1/public_scores?select=*&order=time_sec.desc&limit=' + limit,
        { headers: headers() });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  return { submit, top, ready };
})();
