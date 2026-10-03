# 龟谷择校 · 日本留学生活手帖

从城市与生活出发，寻找适合自己的日本语言学校。它不是只按学费和升学率排序的表格，而是一份可以边逛城市、边看学校、边在地图上理解周边生活的交互手帖。

**在线体验：** <https://xing0325.github.io/guigu-japan-study/>

## 可以做什么

- 从东京、京都、大阪等城市切入，先了解生活节奏与街区气质。
- 浏览语言学校清单，按城市、街区和关键词筛选。
- 在列表与地图之间联动，查看学校位置和周边环境。
- 收藏感兴趣的学校，在同一页继续比较。
- 使用独立学校地图，快速理解学校在城市中的空间关系。

## 数据与内容

当前收录 53 条学校资料，对应原始清单中的 51 条合作记录；另有 1 条校名仍待确认，因此未落点。学校官网始终是招生条件、学费和课程信息的最终来源。

- `locations.json`：学校及地点数据。
- `assets/photo-sources.json`：站内照片来源记录。
- `assets/illustrations/PROMPTS.md`：原创生成插画提示词。
- `vendor/LICENSE.txt`：第三方前端运行库许可。

## 技术实现

项目采用原生 HTML、CSS 和 JavaScript，无需构建步骤。地图使用 MapLibre GL JS，并接入 CARTO / OpenStreetMap 底图；字体和 MapLibre 资源均随仓库提供，适合直接部署到 GitHub Pages。

```text
index.html / entrance.*   首页与城市探索
notebook.*                学校手帖、筛选与收藏
map.html / map-style.json 独立学校地图
locations.json            学校与地点数据
locale.js                  界面文案与本地化
assets/                    图片、字体与插画
vendor/                    自托管第三方库
```

## 本地预览

浏览器会通过 HTTP 读取 JSON，因此请使用本地静态服务器：

```bash
python -m http.server 4173
```

然后打开 <http://localhost:4173/>。

## 部署

GitHub Pages 从 `main` 分支根目录发布。更新并推送 `main` 后，线上版本会自动刷新。

## 说明

这是经过整理的静态发布版本，适合用于择校前期探索，不构成留学申请或招生建议。
