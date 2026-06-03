/**
 * 小星音乐API - Railway 部署版
 */
const http = require('http');

let _search, _songUrl, _lyric;
function load() {
  if (!_search) {
    const api = require('NeteaseCloudMusicApi');
    _search = api.search; _songUrl = api.song_url_v1; _lyric = api.lyric;
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 手动解析URL（更可靠）
  const raw = req.url || '/';
  const qIndex = raw.indexOf('?');
  const path = qIndex >= 0 ? raw.substring(0, qIndex) : raw;
  const qs = qIndex >= 0 ? raw.substring(qIndex + 1) : '';
  const params = {};
  qs.split('&').forEach(p => {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.substring(0, eq)] = decodeURIComponent(p.substring(eq + 1));
  });

  try {
    load();

    if (path === '/search') {
      const r = await _search({
        keywords: params.keywords || '热门',
        limit: Number(params.limit) || 5,
        type: 1
      });
      const songs = (r.body?.result?.songs || []).slice(0, Number(params.limit) || 5).map(s => ({
        id: s.id,
        name: s.name,
        artist: (s.artists || []).map(a => a.name).join(', ')
      }));
      res.end(JSON.stringify({ code: 200, songs }));
      return;

    } else if (path === '/song') {
      const id = Number(params.id) || 0;
      for (const level of ['exhigh', 'higher', 'standard']) {
        const r = await _songUrl({ id, level });
        const d = (r.body?.data || [])[0];
        if (d?.url && d.size > 100000) {
          res.end(JSON.stringify({ code: 200, url: d.url, size: d.size }));
          return;
        }
      }
      res.end(JSON.stringify({ code: 404, msg: 'no full song' }));
      return;

    } else if (path === '/lyric') {
      const id = Number(params.id) || 0;
      const r = await _lyric({ id });
      const lrc = r.body?.lrc?.lyric || '';
      const lines = lrc.split('\n').map(line => {
        let s = '', skip = true;
        for (const ch of line) {
          if (ch === '[') skip = true;
          else if (ch === ']') skip = false;
          else if (!skip) s += ch;
        }
        return s.trim();
      }).filter(Boolean).join('\n');
      res.end(JSON.stringify({ code: 200, lyric: lines }));
      return;

    } else {
      res.end(JSON.stringify({ code: 200, msg: '小星API OK', usage: '/search?keywords=xx /song?id=xx /lyric?id=xx' }));
    }

  } catch (e) {
    res.end(JSON.stringify({ code: 500, msg: e.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('API on port ' + PORT));
