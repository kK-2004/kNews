'use strict';

/**
 * Source definition helpers.
 *
 * defineRSSSource(id, config)  - creates an RSS feed source
 * defineAPISource(id, config)  - creates a JSON API source
 * defineHTMLSource(id, config) - creates an HTML scraping source
 *
 * Each source has:
 *   id       - unique string identifier
 *   name     - human-readable name
 *   url      - the endpoint to fetch
 *   type     - 'rss' | 'api' | 'html'
 *   category - column grouping: 'china' | 'tech' | 'finance' | 'world' | 'entertainment' | 'game' | 'community'
 *   enabled  - whether this source is active (default true)
 *   interval - refresh interval in ms (optional, uses engine default)
 *   config   - type-specific configuration
 */

function defineRSSSource(id, config) {
  return { id, type: 'rss', enabled: true, ...config };
}

function defineAPISource(id, config) {
  return { id, type: 'api', enabled: true, ...config };
}

function defineHTMLSource(id, config) {
  return { id, type: 'html', enabled: true, ...config };
}

// ---------------------------------------------------------------------------
// China / General
// ---------------------------------------------------------------------------

const zhihu = defineAPISource('zhihu', {
  name: '知乎',
  url: 'https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=20&desktop=true',
  category: 'china',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k?.target?.title_area?.text || '',
      url: k?.target?.link?.url || '',
      extra: {
        info: k?.target?.metrics_area?.text || '',
        hover: k?.target?.excerpt_area?.text || '',
      },
    }),
  },
});

const weibo = defineAPISource('weibo', {
  name: '微博',
  url: 'https://weibo.com/ajax/side/hotSearch',
  category: 'china',
  interval: 120000,
  config: {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://weibo.com/hot/search',
    },
    mapResponse: (data) => (data?.data?.realtime || []),
    mapItem: (k) => {
      const word = k.word || k.note || '';
      const encoded = encodeURIComponent(word);
      return {
        title: word,
        url: `https://s.weibo.com/weibo?q=${encoded}`,
        extra: {
          info: k.num ? String(k.num) : '',
        },
      };
    },
  },
});

const baidu = defineHTMLSource('baidu', {
  name: '百度热搜',
  url: 'https://top.baidu.com/board?tab=realtime',
  category: 'china',
  interval: 600000,
  config: {
    extract: ($) => {
      const html = $.html();
      const jsonMatch = html.match(/<!--s-data:(.*?)-->/s);
      if (!jsonMatch) return [];
      try {
        const data = JSON.parse(jsonMatch[1]);
        const content = data?.data?.cards?.[0]?.content || [];
        return content
          .filter((k) => !k.isTop)
          .map((k) => ({
            title: k.word,
            url: k.rawUrl,
            extra: { hover: k.desc },
          }));
      } catch {
        return [];
      }
    },
  },
});

const toutiao = defineAPISource('toutiao', {
  name: '今日头条',
  url: 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
  category: 'china',
  interval: 600000,
  config: {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k.Title,
      url: `https://www.toutiao.com/trending/${k.ClusterIdStr}/`,
      extra: { info: k.HotValue || '' },
    }),
  },
});

const douyin = defineAPISource('douyin', {
  name: '抖音',
  url: 'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1',
  category: 'china',
  interval: 600000,
  config: {
    async preFetch(fetchFn) {
      const res = await fetchFn('https://login.douyin.com/', { redirect: 'manual' });
      const cookies = res.headers.getSetCookie?.() || [];
      if (cookies.length) {
        return { cookie: cookies.map((c) => c.split(';')[0]).join('; ') };
      }
      return {};
    },
    mapResponse: (data) => (data?.data?.word_list || []),
    mapItem: (k) => ({
      title: k.word,
      url: `https://www.douyin.com/hot/${k.sentence_id}`,
      extra: { info: k.hot_value ? `${k.hot_value} 热度` : '' },
    }),
  },
});

const thepaper = defineAPISource('thepaper', {
  name: '澎湃新闻',
  url: 'https://cache.thepaper.cn/contentapi/wwwIndex/rightSidebar',
  category: 'china',
  interval: 1800000,
  config: {
    mapResponse: (data) => (data?.data?.hotNews || []),
    mapItem: (k) => ({
      title: k.name,
      url: `https://www.thepaper.cn/newsDetail_forward_${k.contId}`,
    }),
  },
});

const tieba = defineAPISource('tieba', {
  name: '百度贴吧',
  url: 'https://tieba.baidu.com/hottopic/browse/topicList',
  category: 'china',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data?.bang_topic?.topic_list || []),
    mapItem: (k) => ({
      title: k.topic_name,
      url: k.topic_url,
    }),
  },
});

const ifeng = defineHTMLSource('ifeng', {
  name: '凤凰网',
  url: 'https://www.ifeng.com/',
  category: 'china',
  interval: 600000,
  config: {
    extract: ($) => {
      const html = $.html();
      const match = /var\s+allData\s*=\s*(\{[\s\S]*?\});/.exec(html);
      if (!match) return [];
      try {
        const realData = JSON.parse(match[1]);
        const rawNews = realData.hotNews1 || [];
        return rawNews.map((k) => ({
          title: k.title,
          url: k.url,
          extra: { info: k.newsTime || '' },
        }));
      } catch {
        return [];
      }
    },
  },
});

const nowcoder = defineAPISource('nowcoder', {
  name: '牛客网',
  url: 'https://gw-c.nowcoder.com/api/sparta/hot-search/top-hot-pc?size=20',
  category: 'china',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data?.result || []),
    mapItem: (k) => {
      let url, id;
      if (k.type === 74) {
        url = `https://www.nowcoder.com/feed/main/detail/${k.uuid}`;
        id = k.uuid;
      } else if (k.type === 0) {
        url = `https://www.nowcoder.com/discuss/${k.id}`;
        id = k.id;
      }
      return { title: k.title, url, id };
    },
  },
});

const hupu = defineHTMLSource('hupu', {
  name: '虎扑',
  url: 'https://bbs.hupu.com/topic-daily-hot',
  category: 'china',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('li.bbs-sl-web-post-body').each((_, el) => {
        const a = $(el).find('a.p-title');
        const href = a.attr('href');
        const title = a.text().trim();
        if (href && title) {
          items.push({
            title,
            url: `https://bbs.hupu.com${href}`,
          });
        }
      });
      return items;
    },
  },
});

const cankaoxiaoxi = defineAPISource('cankaoxiaoxi', {
  name: '参考消息',
  url: 'https://china.cankaoxiaoxi.com/json/channel/zhongguo/list.json',
  category: 'china',
  interval: 600000,
  config: {
    mapResponse: (data) => {
      // This endpoint returns a single channel; we just use it directly
      return (data?.list || []);
    },
    mapItem: (k) => ({
      title: k?.data?.title || '',
      url: k?.data?.url || '',
      extra: { info: k?.data?.publishTime || '' },
    }),
  },
});

// ---------------------------------------------------------------------------
// Tech
// ---------------------------------------------------------------------------

const hackernews = defineHTMLSource('hackernews', {
  name: 'Hacker News',
  url: 'https://news.ycombinator.com/',
  category: 'tech',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.athing').each((_, el) => {
        const a = $(el).find('.titleline a').first();
        const title = a.text().trim();
        const id = $(el).attr('id');
        const score = $(`#score_${id}`).text().trim();
        if (title && id) {
          items.push({
            title,
            url: `https://news.ycombinator.com/item?id=${id}`,
            extra: { info: score },
          });
        }
      });
      return items;
    },
  },
});

const github = defineHTMLSource('github', {
  name: 'Github',
  url: 'https://github.com/trending?spoken_language_code=',
  category: 'tech',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('main .Box div[data-hpc] > article').each((_, el) => {
        const a = $(el).find('>h2 a');
        const title = a.text().replace(/\n+/g, '').trim();
        const href = a.attr('href');
        const star = $(el).find('[href$=stargazers]').text().replace(/\s+/g, '').trim();
        const desc = $(el).find('>p').text().replace(/\n+/g, '').trim();
        if (href && title) {
          items.push({
            title,
            url: `https://github.com${href}`,
            extra: { info: star ? `\u2729 ${star}` : '', hover: desc },
          });
        }
      });
      return items;
    },
  },
});

const ithome = defineHTMLSource('ithome', {
  name: 'IT之家',
  url: 'https://www.ithome.com/list/',
  category: 'tech',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('#list > div.fl > ul > li').each((_, el) => {
        const $a = $(el).find('a.t');
        const url = $a.attr('href');
        const title = $a.text().trim();
        const date = $(el).find('i').text().trim();
        if (url && title) {
          const isAd = url.includes('lapin') ||
            ['神券', '优惠', '补贴', '京东'].some((k) => title.includes(k));
          if (!isAd) {
            items.push({
              title,
              url: url.startsWith('http') ? url : `https://www.ithome.com${url}`,
              extra: { info: date || '' },
            });
          }
        }
      });
      return items;
    },
  },
});

const juejin = defineAPISource('juejin', {
  name: '稀土掘金',
  url: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot&spider=0',
  category: 'tech',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k.content.title,
      url: `https://juejin.cn/post/${k.content.content_id}`,
    }),
  },
});

const sspai = defineAPISource('sspai', {
  name: '少数派',
  url: `https://sspai.com/api/v1/article/tag/page/get?limit=30&offset=0&created_at=${Date.now()}&tag=%E7%83%AD%E9%97%A8%E6%96%87%E7%AB%A0&released=false`,
  category: 'tech',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k.title,
      url: `https://sspai.com/post/${k.id}`,
    }),
  },
});

const solidot = defineHTMLSource('solidot', {
  name: 'Solidot',
  url: 'https://www.solidot.org',
  category: 'tech',
  interval: 3600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.block_m').each((_, el) => {
        const a = $(el).find('.bg_htit a').last();
        const href = a.attr('href');
        const title = a.text().trim();
        if (href && title) {
          items.push({
            title,
            url: `https://www.solidot.org${href}`,
          });
        }
      });
      return items;
    },
  },
});

const v2ex = defineAPISource('v2ex', {
  name: 'V2EX',
  url: 'https://www.v2ex.com/feed/share.json',
  category: 'tech',
  interval: 600000,
  config: {
    mapResponse: (data) => {
      // JSON Feed format
      return (data?.items || []);
    },
    mapItem: (k) => ({
      title: k.title || '',
      url: k.url || '',
      extra: { info: k.date_modified || k.date_published || '' },
    }),
  },
});

const _36kr = defineHTMLSource('36kr', {
  name: '36氪',
  url: 'https://www.36kr.com/newsflashes',
  category: 'tech',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.newsflash-item').each((_, el) => {
        const $a = $(el).find('a.item-title');
        const url = $a.attr('href');
        const title = $a.text().trim();
        if (url && title) {
          items.push({
            title,
            url: url.startsWith('http') ? url : `https://www.36kr.com${url}`,
          });
        }
      });
      return items;
    },
  },
});

const _36krRenqi = defineHTMLSource('36kr-renqi', {
  name: '36氪人气',
  url: 'https://36kr.com/hot-list/renqi/',
  category: 'tech',
  interval: 600000,
  config: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    extract: ($) => {
      const items = [];
      $('.article-item-info').each((_, el) => {
        const $a = $(el).find('a.article-item-title.weight-bold');
        const href = $a.attr('href') || '';
        const title = $a.text().trim();
        const author = $(el).find('.kr-flow-bar-author').text().trim();
        const hot = $(el).find('.kr-flow-bar-hot span').text().trim();
        const desc = $(el).find('a.article-item-description.ellipsis-2').text().trim();
        if (href && title) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://36kr.com${href}`,
            extra: {
              info: `${author}  |  ${hot}`,
              hover: desc,
            },
          });
        }
      });
      return items;
    },
  },
});

const coolapk = defineAPISource('coolapk', {
  name: '酷安',
  url: 'https://api.coolapk.com/v6/page/dataList?url=%2Ffeed%2FstatList%3FcacheExpires%3D300%26statType%3Dday%26sortField%3Ddetailnum%26title%3D%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&title=%E4%BB%8A%E6%97%A5%E7%83%AD%E9%97%A8&subTitle=&page=1',
  category: 'tech',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k.editor_title || (k.message || '').split('\n')[0],
      url: `https://www.coolapk.com${k.url}`,
      extra: { info: k.targetRow?.subTitle || '' },
    }),
  },
});

const freebuf = defineHTMLSource('freebuf', {
  name: 'FreeBuf',
  url: 'https://www.freebuf.com/',
  category: 'tech',
  interval: 600000,
  config: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    extract: ($) => {
      const items = [];
      $('.article-item').each((_, el) => {
        const $article = $(el);
        const titleLink = $article.find('.title-left .title').parent();
        const title = titleLink.find('.title').text().trim();
        const href = titleLink.attr('href');
        const desc = $article.find('.item-right .text-line-2').text().trim();
        if (title && href) {
          const url = href.startsWith('http') ? href : `https://www.freebuf.com${href}`;
          const idMatch = url.match(/(\d+)\.html/);
          items.push({
            title,
            url,
            id: idMatch ? idMatch[1] : url,
            extra: { hover: desc },
          });
        }
      });
      return items;
    },
  },
});

const smzdm = defineHTMLSource('smzdm', {
  name: '什么值得买',
  url: 'https://post.smzdm.com/hot_1/',
  category: 'tech',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('#feed-main-list .z-feed-title a').each((_, el) => {
        const url = $(el).attr('href');
        const title = $(el).text().trim();
        if (url && title) {
          items.push({ title, url });
        }
      });
      return items;
    },
  },
});

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

const wallstreetcn = defineAPISource('wallstreetcn', {
  name: '华尔街见闻',
  url: 'https://api-one.wallstcn.com/apiv1/content/lives?channel=global-channel&limit=30',
  category: 'finance',
  interval: 300000,
  config: {
    mapResponse: (data) => (data?.data?.items || []),
    mapItem: (k) => ({
      title: k.title || k.content_text || '',
      url: k.uri || '',
    }),
  },
});

const cls = defineAPISource('cls', {
  name: '财联社',
  url: 'https://www.cls.cn/nodeapi/updateTelegraphList',
  category: 'finance',
  interval: 300000,
  config: {
    mapResponse: (data) => (data?.data?.roll_data || []),
    mapItem: (k) => ({
      title: k.title || k.brief || '',
      url: `https://www.cls.cn/detail/${k.id}`,
    }),
  },
});

const xueqiu = defineAPISource('xueqiu', {
  name: '雪球',
  url: 'https://stock.xueqiu.com/v5/stock/hot_stock/list.json?size=30&_type=10&type=10',
  category: 'finance',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.data?.items || []),
    mapItem: (k) => ({
      title: k.name || '',
      url: `https://xueqiu.com/s/${k.code}`,
      extra: { info: `${k.percent}% ${k.exchange || ''}` },
    }),
  },
});

const gelonghui = defineHTMLSource('gelonghui', {
  name: '格隆汇',
  url: 'https://www.gelonghui.com/news/',
  category: 'finance',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.article-content').each((_, el) => {
        const a = $(el).find('.detail-right>a');
        const href = a.attr('href');
        const title = a.find('h2').text().trim();
        const info = $(el).find('.time > span:nth-child(1)').text().trim();
        if (href && title) {
          items.push({
            title,
            url: `https://www.gelonghui.com${href}`,
            extra: { info },
          });
        }
      });
      return items;
    },
  },
});

const fastbull = defineHTMLSource('fastbull', {
  name: '快牛',
  url: 'https://www.fastbull.com/cn/express-news',
  category: 'finance',
  interval: 300000,
  config: {
    extract: ($) => {
      const items = [];
      $('.news-list').each((_, el) => {
        const a = $(el).find('.title_name');
        const href = a.attr('href');
        const titleText = a.text();
        const title = titleText.match(/【(.+)】/)?.[1] ?? titleText;
        if (href && title) {
          items.push({
            title: title.length < 4 ? titleText : title,
            url: `https://www.fastbull.com${href}`,
          });
        }
      });
      return items;
    },
  },
});

const mktnews = defineAPISource('mktnews', {
  name: 'MKTNews',
  url: 'https://api.mktnews.net/api/flash?type=0&limit=50',
  category: 'finance',
  interval: 300000,
  config: {
    mapResponse: (data) => (data?.data || []),
    mapItem: (k) => ({
      title: k.data?.title || k.data?.content?.match(/^【([^】]*)】/)?.[1] || k.data?.content || '',
      url: `https://mktnews.net/flashDetail.html?id=${k.id}`,
      extra: {
        info: k.important === 1 ? 'Important' : '',
        hover: k.data?.content || '',
      },
    }),
  },
});

const jin10 = defineAPISource('jin10', {
  name: '金十数据',
  url: `https://www.jin10.com/flash_newest.js?t=${Date.now()}`,
  category: 'finance',
  interval: 300000,
  config: {
    // Response is JS, not pure JSON
    mapResponse: (raw) => {
      if (typeof raw !== 'string') return [];
      const jsonStr = raw.replace(/^var\s+newest\s*=\s*/, '').replace(/;*$/, '').trim();
      try {
        return JSON.parse(jsonStr);
      } catch {
        return [];
      }
    },
    mapItem: (k) => {
      const text = (k.data?.title || k.data?.content || '').replace(/<\/?b>/g, '');
      const match = text.match(/^【([^】]*)】(.*)$/);
      return {
        title: match ? match[1] : text,
        url: `https://flash.jin10.com/detail/${k.id}`,
        extra: {
          info: k.important ? '✰' : '',
          hover: match ? match[2] : '',
        },
      };
    },
  },
});

const kaopu = defineAPISource('kaopu', {
  name: '靠谱新闻',
  url: 'https://kaopustorage.blob.core.windows.net/news-prod/news_list_hans_0.json',
  category: 'finance',
  interval: 600000,
  config: {
    mapResponse: (data) => {
      if (!Array.isArray(data)) return [];
      return data.filter((k) => !['财新', '公视'].includes(k.publisher));
    },
    mapItem: (k) => ({
      title: k.title,
      url: k.link,
      extra: {
        info: k.publisher || '',
        hover: k.description || '',
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

const sputniknewscn = defineRSSSource('sputniknewscn', {
  name: '卫星通讯社',
  url: 'https://sputniknews.cn/rss/news.xml',
  category: 'world',
  interval: 600000,
});

const zaobao = defineHTMLSource('zaobao', {
  name: '联合早报',
  url: 'https://www.zaobao.com/realtime/china',
  category: 'world',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.article-list .article-item a').each((_, el) => {
        const href = $(el).attr('href');
        const title = $(el).find('.article-title').text().trim() || $(el).text().trim();
        if (href && title) {
          items.push({
            title,
            url: href.startsWith('http') ? href : `https://www.zaobao.com${href}`,
          });
        }
      });
      return items;
    },
  },
});

// ---------------------------------------------------------------------------
// Entertainment
// ---------------------------------------------------------------------------

const bilibili = defineAPISource('bilibili', {
  name: 'B站热搜',
  url: 'https://s.search.bilibili.com/main/hotword?limit=30',
  category: 'entertainment',
  interval: 600000,
  config: {
    headers: {
      Referer: 'https://www.bilibili.com/',
    },
    mapResponse: (data) => {
      const direct = Array.isArray(data?.list) ? data.list : [];
      if (direct.length) return direct;
      const trending = Array.isArray(data?.data?.trending?.list) ? data.data.trending.list : [];
      const fallback = Array.isArray(data?.data?.list) ? data.data.list : [];
      return trending.length ? trending : fallback;
    },
    mapItem: (k) => ({
      title: k.show_name || k.keyword || k.word || '',
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(k.keyword || k.word || '')}`,
      extra: { icon: k.icon || '' },
    }),
  },
});

const bilibiliHotVideo = defineAPISource('bilibili-hot-video', {
  name: 'B站热门',
  url: 'https://api.bilibili.com/x/web-interface/popular',
  category: 'entertainment',
  interval: 600000,
  config: {
    headers: { Referer: 'https://www.bilibili.com/' },
    mapResponse: (data) => (data?.data?.list || []),
    mapItem: (v) => ({
      title: v.title || '',
      url: `https://www.bilibili.com/video/${v.bvid}`,
      extra: {
        info: `${v.owner?.name || ''} · ${_formatNum(v.stat?.view)}观看 · ${_formatNum(v.stat?.like)}点赞`,
        hover: v.desc || '',
      },
    }),
  },
});

const bilibiliRanking = defineAPISource('bilibili-ranking', {
  name: 'B站排行',
  url: 'https://api.bilibili.com/x/web-interface/ranking/v2',
  category: 'entertainment',
  interval: 600000,
  config: {
    headers: { Referer: 'https://www.bilibili.com/' },
    mapResponse: (data) => (data?.data?.list || []),
    mapItem: (v) => ({
      title: v.title || '',
      url: `https://www.bilibili.com/video/${v.bvid}`,
      extra: {
        info: `${v.owner?.name || ''} · ${_formatNum(v.stat?.view)}观看 · ${_formatNum(v.stat?.like)}点赞`,
        hover: v.desc || '',
      },
    }),
  },
});

const douban = defineAPISource('douban', {
  name: '豆瓣',
  url: 'https://m.douban.com/rexxar/api/v2/subject/recent_hot/movie',
  category: 'entertainment',
  interval: 600000,
  config: {
    headers: {
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
    mapResponse: (data) => (data?.items || []),
    mapItem: (k) => ({
      title: k.title || '',
      url: `https://movie.douban.com/subject/${k.id}`,
      extra: {
        info: (k.card_subtitle || '').split(' / ').slice(0, 3).join(' / '),
        hover: k.card_subtitle || '',
      },
    }),
  },
});

const kuaishou = defineHTMLSource('kuaishou', {
  name: '快手',
  url: 'https://www.kuaishou.com/?isHome=1',
  category: 'entertainment',
  interval: 600000,
  config: {
    extract: ($) => {
      const html = $.html();
      const matches = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});/);
      if (!matches) return [];
      try {
        const data = JSON.parse(matches[1]);
        const dc = data.defaultClient || {};
        const hotRankId = dc['ROOT_QUERY']?.['visionHotRank({"page":"home"})']?.id;
        if (!hotRankId) return [];
        const hotRankData = dc[hotRankId];
        if (!hotRankData?.items) return [];
        return hotRankData.items
          .filter((k) => dc[k.id]?.tagType !== '置顶')
          .map((item) => {
            const hotItem = dc[item.id] || {};
            return {
              title: hotItem.name || item.id.replace('VisionHotRankItem:', ''),
              url: `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(hotItem.name || '')}`,
              extra: { icon: hotItem.iconUrl || '' },
            };
          });
      } catch {
        return [];
      }
    },
  },
});

const qqvideo = defineAPISource('qqvideo-tv-hotsearch', {
  name: '腾讯视频',
  url: 'https://pbaccess.video.qq.com/trpc.vector_layout.page_view.PageService/getCard?video_appid=3000010&vversion_platform=2',
  category: 'entertainment',
  interval: 600000,
  config: {
    method: 'POST',
    headers: { Referer: 'https://v.qq.com/' },
    body: JSON.stringify({
      page_params: {
        rank_channel_id: '100113',
        rank_name: 'HotSearch',
        rank_page_size: '30',
        tab_mvl_sub_mod_id: '792ac_19e77Sub_1b2',
        tab_name: '热搜榜',
        tab_type: 'hot_rank',
        tab_vl_data_src: 'f5200deb4596bbf3',
        page_id: 'scms_shake',
        page_type: 'scms_shake',
        source_key: '',
        tag_id: '',
        tag_type: '',
        new_mark_label_enabled: '1',
      },
      page_context: { page_index: '1' },
      flip_info: {
        page_strategy_id: '',
        page_module_id: '792ac_19e77',
        module_strategy_id: {},
        sub_module_id: '20251106065177',
        flip_params: {
          folding_screen_show_num: '',
          is_mvl: '1',
          mvl_strategy_info: '{"default_strategy_id":"06755800b45b49238582a6fa1ad0f5c5","default_version":"3836","hit_page_uuid":"b5080d97dc694a5fb50eb9e7c99326ac","hit_tab_info":null,"gray_status_info":null,"bypass_to_un_exp_id":""}',
          mvl_sub_mod_id: '20251106065177',
          pad_post_show_num: '',
          pad_pro_post_show_num: '',
          pad_pro_small_hor_pic_display_num: '',
          pad_small_hor_pic_display_num: '',
          page_id: 'scms_shake',
          page_num: '0',
          page_type: 'scms_shake',
          post_show_num: '',
          shake_size: '',
          small_hor_pic_display_num: '',
          source_key: '100113',
          un_policy_id: '06755800b45b49238582a6fa1ad0f5c5',
          un_strategy_id: '06755800b45b49238582a6fa1ad0f5c5',
        },
        relace_children_key: [],
      },
    }),
    mapResponse: (data) => {
      return data?.data?.card?.children_list?.list?.cards || [];
    },
    mapItem: (k) => ({
      title: k?.params?.title || '',
      url: `https://v.qq.com/x/cover/${k?.id}.html`,
      extra: { hover: k?.params?.sub_title || '' },
    }),
  },
});

const iqiyi = defineAPISource('iqiyi', {
  name: '爱奇艺',
  url: 'https://mesh.if.iqiyi.com/portal/lw/v7/channel/card/videoTab?channelName=recommend&data_source=v7_rec_sec_hot_rank_list&tempId=85&count=30&block_id=hot_ranklist&device=14a4b5ba98e790dce6dc07482447cf48&from=webapp',
  category: 'entertainment',
  interval: 600000,
  config: {
    headers: { Referer: 'https://www.iqiyi.com' },
    mapResponse: (data) => (data?.items?.[0]?.video?.[0]?.data || []),
    mapItem: (k) => ({
      title: k.title || '',
      url: k.page_url || '',
      extra: {
        info: k.desc || '',
        hover: k.description || '',
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

const steam = defineHTMLSource('steam', {
  name: 'Steam',
  url: 'https://store.steampowered.com/stats/stats/',
  category: 'game',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('#detailStats tr.player_count_row').each((_, el) => {
        const $a = $(el).find('a.gameLink');
        const url = $a.attr('href');
        const gameName = $a.text().trim();
        const currentPlayers = $(el).find('td:first-child .currentServers').text().trim();
        if (url && gameName && currentPlayers) {
          items.push({
            title: gameName,
            url,
            extra: { info: currentPlayers },
          });
        }
      });
      return items;
    },
  },
});

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

const linuxdo = defineAPISource('linuxdo', {
  name: 'Linux.do',
  url: 'https://linux.do/latest.json?order=created',
  category: 'community',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.topic_list?.topics || []),
    mapItem: (k) => {
      if (!k.visible || k.archived || k.pinned) return null;
      return {
        title: k.title,
        url: `https://linux.do/t/topic/${k.id}`,
      };
    },
  },
});

const linuxdoHot = defineAPISource('linuxdo-hot', {
  name: 'Linux.do热门',
  url: 'https://linux.do/top/daily.json',
  category: 'community',
  interval: 600000,
  config: {
    mapResponse: (data) => (data?.topic_list?.topics || []),
    mapItem: (k) => {
      if (!k.visible || k.archived || k.pinned) return null;
      return {
        title: k.title,
        url: `https://linux.do/t/topic/${k.id}`,
      };
    },
  },
});

const chongbuluo = defineHTMLSource('chongbuluo', {
  name: '虫部落',
  url: 'https://www.chongbuluo.com/forum.php?mod=guide&view=hot',
  category: 'community',
  interval: 600000,
  config: {
    extract: ($) => {
      const items = [];
      $('.bmw table tr').each((_, el) => {
        const title = $(el).find('.common .xst').text().trim();
        const href = $(el).find('.common a').attr('href');
        if (title && href) {
          items.push({
            title,
            url: `https://www.chongbuluo.com/${href}`,
          });
        }
      });
      return items;
    },
  },
});

const pcbeta = defineRSSSource('pcbeta', {
  name: '远景论坛',
  url: 'https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&auth=0',
  category: 'community',
  interval: 600000,
});

const tencent = defineAPISource('tencent-hot', {
  name: '腾讯新闻',
  url: 'https://i.news.qq.com/web_backend/v2/getTagInfo?tagId=aEWqxLtdgmQ%3D',
  category: 'china',
  interval: 600000,
  config: {
    headers: { Referer: 'https://news.qq.com/' },
    mapResponse: (data) => (data?.data?.tabs?.[0]?.articleList || []),
    mapItem: (k) => ({
      title: k.title || '',
      url: k.link_info?.url || '',
      extra: { hover: k.desc || '' },
    }),
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _formatNum(num) {
  if (!num) return '0';
  if (num >= 10000) return `${Math.floor(num / 10000)}w+`;
  return String(num);
}

// ---------------------------------------------------------------------------
// Export all sources as an array + helpers
// ---------------------------------------------------------------------------

const sources = [
  // China
  zhihu,
  weibo,
  baidu,
  toutiao,
  douyin,
  thepaper,
  tieba,
  ifeng,
  nowcoder,
  hupu,
  cankaoxiaoxi,
  tencent,
  // Tech
  hackernews,
  github,
  ithome,
  juejin,
  sspai,
  solidot,
  v2ex,
  _36kr,
  _36krRenqi,
  coolapk,
  freebuf,
  smzdm,
  // Finance
  wallstreetcn,
  cls,
  xueqiu,
  gelonghui,
  fastbull,
  mktnews,
  jin10,
  kaopu,
  // World
  sputniknewscn,
  zaobao,
  // Entertainment
  bilibili,
  bilibiliHotVideo,
  bilibiliRanking,
  douban,
  kuaishou,
  qqvideo,
  iqiyi,
  // Game
  steam,
  // Community
  linuxdo,
  linuxdoHot,
  chongbuluo,
  pcbeta,
];

module.exports = {
  sources,
  defineRSSSource,
  defineAPISource,
  defineHTMLSource,
};
