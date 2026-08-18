# 旅图 TripCanvas

> Turn trip ideas into shareable route maps.

TripCanvas 是一款旅行路线图创作工具。用户输入地点列表或自然语言旅行想法，应用将其转化为适合小红书发布的路线地图、编号点位、文字标注和 PNG 图片。

## 当前状态

v0.1 已完成；v0.2 的 Prompt 草案、候选确认和可配置 geocoding/routing adapter 已接入；v0.3 已具备模板、Carousel、站点内容、水印与多图 ZIP。当前还提供 Google Maps/Routes 可选模式和浏览器插件多点导入契约。核心链路为：

`Prompt / 地点列表 → geocoding → 路线图 → 标注 → PNG 导出`

详细工作计划见 [docs/PLAN.md](docs/PLAN.md)，持续进展见 [docs/DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md)，部署与 Google Key 安全配置见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 当前能力

- 输入多行地点列表并生成东京演示坐标
- 使用本地 mock AI 将东京旅行描述转换为经过 Zod 校验的 Trip Draft
- 对地点返回 resolved / unresolved / needs-selection 状态，不再为未知名称静默分配坐标
- 同名地点显示名称与地址候选，用户确认后才把所选坐标写入 Project JSON
- 可通过环境变量切换到 Nominatim-compatible 地点服务；第三方响应先经过 Zod 校验
- 手动路线支持步行或驾车；可切换 OSRM-compatible 服务，并在失败时自动回退直线
- 可选 Google Maps JavaScript API + 新 Route class，多途经点路线会保存逐段距离、时间和 geometry
- 浏览器插件可一次导入最多 27 个带坐标、说明和 Google Maps 链接的地点
- 编辑态地点标签可点击打开外部地图，逐段时间气泡会进入 PNG 与路线页 ZIP
- 海岸蓝、薄荷青和冷白灰组成的清爽编辑器主题
- 城市漫步、一日精华、咖啡巡游、拍照机位四套持久化模板
- 模板同步控制画布比例、路线、编号、标签、标题区和默认副标题
- 可直接编辑海报标题和副标题，并写入 Project JSON
- 自动派生封面、路线和每站详情页面，并提供 carousel 预览
- 使用 JSZip 将全部页面按顺序打包为一个 ZIP 下载
- Carousel 页面可排除、排序；品牌水印可编辑位置、文字、透明度
- 每站可编辑名称、地址、分类、攻略文案和点击外链
- 自动缩放地图、生成编号点位和文字标签
- 按地点顺序绘制可配置的直线路线
- 添加、拖拽、编辑地理绑定文字标注
- 使用 localStorage 自动保存并恢复 Project JSON
- 以 3:4、4:5、9:16 比例导出 PNG

## 计划技术栈

- React、Vite、TypeScript
- Tailwind CSS、Zustand
- MapLibre GL JS、Google Maps JavaScript API（可选）、react-konva / Konva
- html-to-image、JSZip、localStorage

## 计划目录

```text
src/
  app/          应用入口与路由
  components/   布局、编辑器、地图、面板与基础 UI
  services/     地理编码、路线、导出、存储与 AI 服务
  store/        Zustand 状态
  types/        Place、Route、Annotation、Project 领域类型
  utils/        坐标转换、ID、日期等工具
docs/           计划、日志与决策记录
```

## 本地开发（项目初始化后）

```bash
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env.local`，只在本地配置第三方服务密钥或服务端点。默认地点使用 mock、底图使用 MapLibre、路线使用 straight，不要求密钥。

Google 模式需要在同一 Google Cloud 项目中启用 Maps JavaScript API、Routes API、Maps Static API 和 Places API (New)，并配置受 HTTP Referrer 限制的 Key：

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_restricted_key
VITE_MAP_PROVIDER=google
VITE_ROUTING_PROVIDER=google
```

Google Routes 与 Google 底图必须成套启用。编辑器使用 Google 地图，导出时改用带官方归属标识的 Static Maps 底图，再叠加 TripCanvas 的 Konva 路线、站点和逐段时间。

浏览器插件导入消息格式见 [docs/PLUGIN_IMPORT.md](docs/PLUGIN_IMPORT.md)。

上线时请遵循 [部署与 Google Maps 配置](docs/DEPLOYMENT.md)：Key 必须同时配置 HTTP Referrer 限制和 API 限制，且不得提交到仓库。

## 发展路线

- **v0.1**：地点列表生成可编辑、可导出的路线图。
- **v0.2**：Prompt 解析为经过校验的旅行路线草案，接入真实地点搜索。
- **v0.3**：路线模板、多图 ZIP、页面编排、品牌水印、详情内容和插件导入已完成。
- **v0.4**：Google Maps、Routes、Static Maps 与 Chrome 扩展导入已完成本地验证；下一步是部署与真实地点搜索体验打磨。

## 当前限制

- 无 Google/OSRM 配置时仍使用东京演示坐标与直线连线，不代表真实步行路线。
- 使用 Carto 公共底图作为开发底图；上线前须确认稳定性、配额、归属与导出场景的适用性。
- 地图编辑器与 html-to-image 的导出依赖浏览器 WebGL/CORS 能力；部分设备或底图资源可能导致导出失败。
- 默认仍使用本地 mock 地点；生产环境的真实地点搜索服务需要按目标地区、成本和配额另行选择及配置。
- Google 模式需要启用计费和四个 API；地图、路线和静态导出已真实联调，Places API（New）仍待 Key 放行后回归。仓库不包含 Key，部署时必须依照 [部署文档](docs/DEPLOYMENT.md) 设置受限环境变量。
- 站点详情页目前以文字信息为主，尚未支持用户上传照片或为每站配置独立图片。
