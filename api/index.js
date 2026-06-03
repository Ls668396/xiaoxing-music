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
      var rawSongs = (r.body && r.body.result && r.body.result.songs) || [];
      var songs = rawSongs.slice(0, Number(params.limit) || 5).map(function(s) {
        return { id: s.id, name: s.name, artist: (s.artists || []).map(function(a){return a.name;}).join(', ') };
      });
      res.end(JSON.stringify({ code: 200, songs: songs }));
      return;

    } else if (path === '/song') {
      var id = Number(params.id) || 0;
      for (var li = 0; li < ['exhigh','higher','standard'].length; li++) {
        var level = ['exhigh','higher','standard'][li];
        var sr = await _songUrl({ id: id, level: level });
        var d = (sr.body && sr.body.data || [])[0];
        if (d && d.url) {
          res.end(JSON.stringify({ code: 200, url: d.url, size: d.size }));
          return;
        }
      }
      res.end(JSON.stringify({ code: 404, msg: 'no url' }));
      return;

    } else if (path === '/lyric') {
      var id = Number(params.id) || 0;
      var lr = await _lyric({ id: id });
      var lrc = (lr.body && lr.body.lrc && lr.body.lrc.lyric) || '';
      var lines = lrc.split('\n').map(function(line) {
        var s = '', skip = true;
        for (var ci = 0; ci < line.length; ci++) {
          var ch = line[ci];
          if (ch === '[') skip = true;
          else if (ch === ']') skip = false;
          else if (!skip) s += ch;
        }
        return s.trim();
      }).filter(function(l){return l.length > 0;}).join('\n');
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
