/**
 * 小星音乐API - Vercel Serverless
 * 24小时在线，给小星瓦力提供音乐搜索+播放+歌词
 */

// 动态导入避免冷启动加载整个包
let _modules = null;
async function getModules() {
  if (!_modules) {
    _modules = {
      search: require('NeteaseCloudMusicApi').search,
      song_url_v1: require('NeteaseCloudMusicApi').song_url_v1,
      lyric: require('NeteaseCloudMusicApi').lyric,
    };
  }
  return _modules;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { query } = req;
    const action = query.action || '';

    if (action === 'search') {
      const mods = await getModules();
      const keywords = query.keywords || '热门';
      const limit = Number(query.limit) || 5;
      const result = await mods.search({ keywords, limit, type: 1 }, '');
      // 精简返回给ESP32(省流量)
      const songs = (result.body?.result?.songs || []).slice(0, limit).map(s => ({
        id: s.id,
        name: s.name,
        artist: (s.artists || []).map(a => a.name).join(', '),
      }));
      return res.json({ code: 200, songs });

    } else if (action === 'url') {
      const mods = await getModules();
      const id = Number(query.id) || 0;
      const level = query.level || 'exhigh';
      // 从高音质到低音质依次尝试
      for (const lv of ['lossless', 'exhigh', 'higher', 'standard']) {
        const result = await mods.song_url_v1({ id, level: query.level || lv }, '');
        const data = (result.body?.data || [])[0];
        if (data?.url && data.size > 500000) {
          return res.json({ code: 200, url: data.url, size: data.size, br: data.br });
        }
      }
      return res.json({ code: 404, msg: 'no full song' });

    } else if (action === 'lyric') {
      const mods = await getModules();
      const id = Number(query.id) || 0;
      const result = await mods.lyric({ id }, '');
      const lrc = result.body?.lrc?.lyric || '';
      // 去掉时间标签
      const clean = lrc.split('\n').map(line => {
        let s = '';
        let skip = true;
        for (const ch of line) {
          if (ch === '[') skip = true;
          else if (ch === ']') skip = false;
          else if (!skip) s += ch;
        }
        return s.trim();
      }).filter(Boolean).join('\n');
      return res.json({ code: 200, lyric: clean });

    } else {
      // 健康检查
      return res.json({ code: 200, msg: '小星音乐API已就绪', action: action || 'none' });
    }

  } catch (e) {
    return res.json({ code: 500, msg: e.message });
  }
};
