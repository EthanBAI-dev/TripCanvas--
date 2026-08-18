# TripCanvas 开发日志

## 记录约定

每次开发完成后追加：日期、范围、主要改动、验证结果和剩余风险。避免在日志中写入 API Key 或用户数据。

---

## 2026-08-17 — 项目规划建立

**范围**

- 建立项目协作规则、README、实施计划和开发日志。
- 确认工作区在开始时为空，尚未初始化应用代码。

**新增文件**

- `AGENTS.md`
- `README.md`
- `docs/PLAN.md`
- `docs/DEVELOPMENT_LOG.md`

**关键决策**

- v0.1 聚焦“地点列表 → 路线图 → 标注 → PNG 导出”。
- 采用 React/Vite/TypeScript、MapLibre、Konva、Zustand 与 localStorage。
- 地理元素保存 `lng/lat`，不将屏幕 `x/y` 用作地理位置的持久化来源。
- 导出能力在地图分层实现时即纳入验证范围。
- 已在工作区初始化 Git 仓库；当前未创建提交，保留给项目所有者决定首次提交时机。

**验证**

- 已检查初始工作区：为空。
- Git 仓库初始化成功；状态仅包含本次创建的项目文档和忽略规则。
- 代码工程尚未初始化，因此本次没有可运行的类型检查或构建。

**下一步**

- 初始化 Vite React TypeScript 工程，安装 MVP 依赖，并实现领域类型、store 和三栏布局。

---

## 2026-08-17 — 阶段 1：MVP 工程骨架

**范围**

- 初始化 React + Vite + TypeScript 项目，配置 Tailwind CSS 与严格 TypeScript。
- 安装 Zustand、MapLibre GL、Konva、html-to-image、clsx 和 nanoid。
- 建立领域类型、Zustand project/editor store、localStorage 持久化入口与三栏编辑器布局。
- 配置 Git `origin` 指向用户提供的 GitHub 仓库；未进行提交或推送。

**主要文件**

- `package.json`、`vite.config.ts`、`tsconfig*.json`、`.env.example`
- `src/types/*`、`src/store/*`、`src/services/storage/projectStorage.ts`
- `src/components/layout/*`、`src/components/panels/*`、`src/components/editor/TripCanvasEditor.tsx`

**验证**

- `npm install`：成功，审计未发现漏洞。
- `npm run build`：通过。

**风险**

- MapLibre 会显著增加初始前端包体，后续应在功能稳定后评估按需加载。

---

## 2026-08-17 — 阶段 2：地图与画布分层

**范围**

- 新增 `MapLibreMap`、`MapStage` 与 `AnnotationLayer`，在同一编辑器容器内叠加 MapLibre 和 Konva。
- 新增 `lngLatToScreen` / `screenToLngLat` 坐标转换工具与元素尺寸监听 hook。
- 在地图 `moveend` 时同步 `center`、`zoom`、`bearing`、`pitch` 到 Project JSON。
- 使用 Carto Positron 公共样式作为无 Key 开发底图。

**验证**

- `npm run build`：通过。
- 浏览器验证：地图可加载；Konva 层覆盖在同一容器中；切换 4:5 后 MapLibre Canvas 从 625 × 833 同步为 625 × 781，恢复 3:4 后正常。
- 浏览器控制台：无 warning 或 error。

**修复**

- MapLibre 的 `.maplibregl-map` 默认定位覆盖 Tailwind 的 `absolute`，使底图初始高度为零。新增 `.tripcanvas-map` 专用定位规则后，地图高度与画布比例一致。

**下一步**

- 实现地点列表的 mock 解析、自动 fit bounds、编号 Pin、文字标签与直线路线。

---

## 2026-08-17 — 阶段 3：地点、路线与基础标注

**范围**

- 新增东京 mock geocoding：识别东京站、银座、筑地市场、东京塔、涩谷站和表参道；其他名称按输入顺序使用演示坐标。
- 依据地点顺序创建带总距离和预计步行时间的直线路线。
- 为每个地点创建持久化的 `Place`、编号 pin annotation 与 label annotation。
- 生成后自动 `fitBounds`，地图移动或缩放时 Konva 路线和标注随地图实时投影。

**验证**

- `npm run build`：通过。
- 浏览器验证：输入默认 4 个东京地点后生成编号 1–4、文字标签和带箭头路线；控制台无 warning 或 error。

---

## 2026-08-17 — 阶段 4：文字编辑与路线样式

**范围**

- 增加 Text 工具：点击地图创建保存为 `lng/lat` 的 note annotation。
- 文字标注可选中、拖拽，拖拽结束时经 `screenToLngLat` 写回 Project JSON。
- 右侧面板可编辑文字内容、字号、文字/背景颜色、加粗、圆角和删除。
- 右侧面板可编辑路线颜色、线宽、虚线与方向箭头。

**验证**

- `npm run build`：通过。
- 浏览器验证：添加“点击编辑文字”，修改为“东京必去”并拖拽；面板正确反映选中状态，控制台无 warning 或 error。

---

## 2026-08-17 — 阶段 5：PNG 导出与 v0.1 收尾

**范围**

- 新增 `html-to-image` 导出服务、时间格式化文件名和下载逻辑。
- 导出前等待地图加载；导出过程中隐藏 MapLibre 控件与开发提示，取消文字选中框。
- 支持 3:4、4:5、9:16 的 1080px 输出尺寸；MapLibre 使用保留绘图缓冲区的 Canvas 上下文。

**验证**

- `npm run build`：通过。
- 浏览器验证：PNG 成功生成，文件名格式为 `tripcanvas-YYYYMMDD-HHmm.png`；无控制台 warning 或 error。
- 刷新页面后仍可看到已生成的路线样式，验证 Project JSON 已由 localStorage 恢复。

**剩余风险**

- 当前底图与 html-to-image 在网络限制、跨域策略或低性能设备上可能影响导出；发布前应做真实设备回归。
- 初始 JavaScript 约 1.57 MB（gzip 约 441 KB），后续应将地图编辑器进行懒加载。

---

## 2026-08-17 — v0.2 阶段 6：Prompt 草案与 geocoding 契约

**范围**

- 安装 Zod，新增 `TripDraft` 类型及运行时 schema。
- 实现本地 `parseTripPrompt` mock，可从东京示例描述中识别地点、主题、出行方式、标题和样式建议。
- 新增 `GeocodingAdapter`、`GeocodingQuery` 和统一结果状态。
- Prompt 中的地点只保留名称、分类和说明，必须经过 geocoding 才能写入带坐标的 `Place`。
- 改造 PlacesPanel：未知地点显示为 unresolved，不再按输入顺序套用错误坐标。
- 改造 PromptPanel：显示 planning、success 和 error 状态，并复用 v0.1 地图生成流程。

**验证**

- `npm install zod`：成功，审计未发现漏洞。
- `npm run build`：通过。
- 浏览器验证：示例 Prompt 生成“涩谷站到表参道半日 City Walk”，包含两个已解析地点。
- 浏览器验证：输入“东京站 / 不存在地点 / 东京塔”时生成两个地点，并显示“未解析：不存在地点”。
- 全新页面控制台无 warning 或 error。

**下一步**

- 选择真实 geocoding provider，实现候选地点选择 UI；当前架构已允许替换 adapter 而不修改 Project、地图或导出流程。

---

## 2026-08-17 — v0.2 阶段 7a：候选地点确认

**范围**

- 为 mock geocoding 增加带名称与地址的同名地点候选；“涩谷”示范返回“涩谷站”和“涩谷十字路口”。
- 新增共享候选选择组件，以及从统一 geocoding 结果提取已确认地点的服务函数。
- PlacesPanel 与 PromptPanel 均支持 `needs-selection` 状态；候选未选完时禁止生成。
- 用户确认后才将候选 `Place.lng/lat` 写入 Project JSON，未知地点继续保持 unresolved。

**服务选择说明**

- 核对了 OpenStreetMap Foundation 的公共 Nominatim 使用政策：公共实例限制为最多每秒一次、禁止客户端自动补全，并要求应用可切换服务。
- 因此本阶段不把公共 Nominatim 实例硬编码为默认生产服务；真实 provider 仍通过现有 adapter 接入。

**验证**

- `npm run build`：通过；TypeScript 无错误，仅保留地图依赖产生的包体积提示。
- 浏览器验证：输入“涩谷 / 表参道”后显示两个涩谷候选；未选择时应用按钮禁用。
- 选择“涩谷十字路口”后成功生成两个地点，路线距离随所选坐标更新为约 1.2 km。

**下一步**

- 由项目所有者选择 Google Places（高质量、按量计费）或可用于生产的 OSM provider / 自建 Nominatim，再实现真实 adapter 与第三方响应校验。

---

## 2026-08-17 — 主题重做与 v0.2 阶段 7b

**视觉主题**

- 将原有米白与珊瑚橙主题替换为海岸蓝、薄荷青和冷白灰。
- 更新全局颜色、阴影、顶部品牌标识、工具栏、左右面板、编辑画布与主按钮。
- 新生成的路线、编号 Pin、文本默认色均使用新主题。
- Zustand 持久化版本升级到 2；加载旧 Project JSON 时迁移旧路线与标注颜色，不清除用户项目。

**真实地点搜索基础设施**

- 新增可配置的 Nominatim-compatible `GeocodingAdapter`，默认不发送外部请求。
- 支持自由文本 `city + placeName` 搜索，最多返回五个候选并复用现有候选确认 UI。
- 使用 Zod 校验第三方 JSON、经纬度范围和必需字段，再转换为统一 `Place`。
- 加入串行请求、默认每秒一次限速、内存缓存、12 秒超时和友好错误提示。
- 通过 `VITE_GEOCODING_PROVIDER` 与 `VITE_NOMINATIM_BASE_URL` 切换服务，避免硬编码公共实例。

**验证**

- `npm run lint`：通过。
- `npm run build`：通过；保留地图依赖产生的包体积提示。
- 受控 HTTP 响应验证：两个结果正确返回 `needs-selection`，重复查询命中缓存且保留本次地点分类。
- 浏览器验证：旧珊瑚色项目自动迁移为薄荷青；“涩谷 / 表参道”候选确认、地图生成和路线样式正常。

**下一步**

- 配置并验证一个生产可用的 geocoding endpoint；之后进入阶段 8，接入真实 walking / driving 路线与直线 fallback。

---

## 2026-08-17 — v0.2 阶段 8：路线服务与 fallback

**范围**

- 新增统一 `RoutingRequest`、`RoutingDraft`、`RoutingAdapter` 与 `RouteCalculationResult`。
- 实现 OSRM-compatible adapter，使用 `route/v1/{profile}/{coordinates}` 请求完整 GeoJSON 路线。
- 使用 Zod 校验服务状态、经纬度范围、LineString、距离与时间后再转换为领域 `Route`。
- 支持 walking / driving profile 配置、15 秒超时和友好错误处理。
- `calculateRoute` 在 provider 未配置、网络失败、无路线或响应无效时自动使用直线 fallback。
- PlacesPanel 新增步行/驾车选择；PromptPanel 复用草案中的 travelMode。
- StylePanel 显示真实路线/直线预览、实际出行方式、距离和预计时间。

**配置**

- 默认 `VITE_ROUTING_PROVIDER=straight`，不发送外部请求。
- 启用真实服务时配置 `VITE_ROUTING_PROVIDER=osrm`、`VITE_ROUTING_API_BASE_URL`，并可分别设置 walking / driving profile。
- 不硬编码公共 demo router，生产端点由部署环境决定。

**验证**

- 受控 HTTP 响应测试：walking / driving profile 路径正确，三点 GeoJSON、1567 米和 1210 秒正确转换。
- 受控失败测试：adapter 抛错时保留 `straight-line` 路线并返回用户提示。
- 浏览器验证：选择驾车并生成“涩谷站 / 表参道”，右侧显示约 1.3 km、驾车 3 分钟及直线预览。
- `npm run lint`：通过。

**下一步**

- 为 geocoding 与 routing 配置生产服务端点并做真实网络回归。
- 完成端点验证后，开始 v0.3 模板和多图导出，或先接入真实 LLM。

---

## 2026-08-17 — v0.3 阶段 9：路线模板

**范围**

- 新增城市漫步、一日精华、咖啡巡游、拍照机位四套模板。
- 模板定义集中放在 service 层，包含比例、默认副标题、Badge 和完整视觉参数。
- `TripCanvasProject` 新增可选 `templateId`，Zustand 持久化版本升级到 3。
- 旧 Project JSON 自动补充城市漫步模板标识，不清除现有地点、路线或标注。
- 模板应用会同步更新现有路线、编号 Pin、地点标签、画布比例和导出尺寸。
- 后续新生成的路线和标注会继承当前模板。
- 新增 TemplatePanel，可切换模板并直接编辑海报标题与副标题。
- 海报画布新增模板 Badge、副标题和模板化渐变。

**浏览器验证与修复**

- 咖啡巡游模板生成新路线后，路线色保持 `#7c3aed`，副标题编辑正常。
- 拍照机位模板自动切换为 9:16、1080 × 1920，并将路线色切换为 `#0284c7`。
- 浏览器检查发现 9:16 画布因垂直居中导致顶部无法滚动；改为带内层容器的顶部对齐滚动布局后，标题与 Badge 可从顶部完整查看。
- `npm run lint`：通过。

**下一步**

- 阶段 10：封面、路线和站点详情 carousel，多图批量导出与品牌水印。

---

## 2026-08-17 — v0.3 阶段 10：Carousel 与多图 ZIP

**范围**

- 新增 `CarouselPage` 领域类型和 `buildCarouselPages` 派生服务。
- 自动生成封面、路线页以及每个地点的详情页顺序。
- 新增离屏静态导出画布：封面包含行程统计，详情页包含编号、分类、地址、备注与进度。
- 路线页继续复用现有 MapLibre + Konva 画布，保证编辑结果与导出一致。
- 新增 CarouselPanel，显示页面缩略顺序、当前页摘要和批量导出状态。
- 安装 JSZip，将全部 PNG 打包为单个 ZIP，避免浏览器拦截连续下载。

**验证**

- `npm install jszip`：成功，审计未发现漏洞。
- 浏览器使用“东京站 / 银座”生成 4 张素材，页面顺序为封面、路线、站点 1、站点 2。
- 实际生成 `tripcanvas-carousel-20260817-1454.zip`，压缩包约 7.6 MB。
- 解包确认包含 `01-cover.png`、`02-route.png`、`03-place-01.png`、`04-place-02.png`。
- 视觉检查封面、路线和详情 PNG；修复顶部 Badge、城市标签、STOP 编号和页码换行问题。
- `npm run lint`：通过。

**下一步**

- 阶段 11：品牌水印、页面选择/排序和站点详情内容编辑。

---

## 2026-08-17 — v0.3 阶段 11：详情、页面编排与品牌水印

**范围**

- `TripCanvasProject` 新增 Carousel 设置：页面顺序、排除列表和品牌水印。
- Zustand 持久化版本升级到 4，旧项目自动补齐设置，不清除现有内容。
- 新增站点详情面板，可编辑名称、地址、分类、攻略文案和外部链接；修改名称会同步地图标签。
- Carousel 支持逐页包含/排除和前后排序，ZIP 只包含启用页面，并按当前顺序命名。
- 品牌水印支持文字、位置、透明度和开关，同时应用于路线页、封面和站点页。
- 顶部水印增加独立安全区，避免与模板 Badge、城市标签或 STOP 编号重叠。

**验证**

- 浏览器修改首站名称、分类和攻略文案，地图标签与站点详情页同步更新。
- 排除站点 1、将站点 2 前移后导出 3 张 ZIP；解包结果为 `01-cover.png`、`02-route.png`、`03-place-02.png`。
- 实际检查封面、路线和站点 PNG，顶部水印与内容无重叠。
- `npm run lint` 与 `npm run build` 通过。

---

## 2026-08-17 — v0.4 阶段 12a：Google 路线与插件导入基础

**范围**

- 安装官方 `@googlemaps/js-api-loader` 与 Google Maps TypeScript 类型。
- 新增可选 Google Maps JavaScript API 地图组件和统一 `CanvasMapController`，MapLibre/Konva 现有坐标链路继续复用。
- 新增 Google Routes adapter，使用新 `Route.computeRoutes()` 请求多途经点 path、总距离、总时间和 legs。
- Google Routes 只有在 Google 地图模式和 API Key 同时启用时才会运行；缺配置时保留 MapLibre 与直线回退。
- `Route` 新增逐段数据；直线、OSRM 和 Google adapter 都返回每段 geometry、距离与时间。
- 逐段时间在右侧列出，并以气泡渲染到 Konva，因此会进入单图和 ZIP 路线页。
- Google 导出模式以 Static Maps 图片替换动态地图 DOM，再叠加 TripCanvas 路线和标注。
- 新增经过 Zod 校验的插件导入契约，支持最多 27 个带坐标、说明、Place ID 和外链的地点。
- 编辑态带链接的地点标签可点击打开 Google Maps；只允许 http/https URL。
- Zustand 持久化版本升级到 5，为旧路线补充逐段数据。

**验证**

- 无 Google Key 场景：旧项目迁移后显示一段时间，地图、编辑和持久化正常。
- 浏览器粘贴三站插件数据，成功生成“涩谷站 → 代代木公园 → 表参道”两段路线，显示 23 分钟和 24 分钟。
- 两个/三个站点标签均显示可访问的 Google Maps 外链。
- 实际导出 `tripcanvas-20260817-1520.png`，视觉确认两枚逐段时间气泡和全部站点标签进入 PNG。
- `npm run lint` 与 `npm run build` 通过；仅保留现有大包体积提示。

**待验证**

- 仓库不包含 Google API Key。配置启用计费并限制 Referrer 的 Key 后，需要真实验证 Google 地图、Routes Library 与 Static Maps 的加载、逐段时间和导出 CORS。

---

## 2026-08-17 — Google Key 真实联调

**完成**

- 本机 `.env.local` 配置的 Key 只用于本地运行，仍被 Git 忽略。
- 真实 Google Maps JavaScript API 成功加载；编辑器保留 Google 官方归属、TripCanvas 路线与可点击地点标签。
- 真实 Maps Static API 成功导出 `tripcanvas-20260817-1602.png`，确认 Google 底图、官方归属、路线、编号、标签和逐段时间同时存在。
- 修复 Google OverlayView 投影：改用 container pixel 坐标，使 Konva 路线、Pin 和标签在 Google 地图及导出图中正确对齐。
- 修复 Routes Library 字段掩码：JavaScript API 使用 `legs`，而非 REST 风格的 `legs.path` 等子字段。

**Routes 验证完成**

- 在启用 Routes API 后重新导入“涩谷站 → 表参道”路线，Google Routes 成功返回真实道路 geometry、总距离 1.5 km 和步行约 22 分钟。
- 编辑器右侧已显示“Google 路线”及逐段 ETA，不再使用直线回退。

**验证**

- `npm run lint`：通过。
- `npm run build`：通过；保留现有包体积提示。

---

## 2026-08-17 — Chrome 多点路线导入扩展

**完成**

- 新增独立的 Manifest V3 开发期扩展目录 `extension/`，不需要把扩展代码混入 Vite Web App。
- 在 Google Maps 地点详情页捕获名称、链接与 URL 中的 `@lat,lng`，支持依次加入多个站点、编辑名称和坐标、移除站点及本地保存草稿。
- 扩展通过 TripCanvas 已有的 `TRIPCANVAS_IMPORT_ROUTE` 契约，把路线发送到打开的本地编辑器；导入后复用真实 Google Routes、站点说明、外链和 PNG 导出流程。
- 增加扩展加载及使用说明，明确坐标需要在发送前核对，且不读取帐号数据、不上传路线数据、不含 API Key。

**验证**

- `extension/manifest.json` 通过 JSON 解析。
- 三个扩展脚本通过 Node 语法检查。
- Web App 的 `npm run lint` 与 `npm run build` 通过；保留现有包体积提示。

---

## 2026-08-18 — 部署与 Key 安全说明

**完成**

- 新增 `docs/DEPLOYMENT.md`，记录 Google Maps JavaScript API、Routes API、Maps Static API 的启用、Referrer 限制和 API 限制步骤。
- 记录上线验证清单以及 Key 出现在聊天、日志或公开内容后的轮换、重新部署和旧 Key 停用流程。
- README 增加部署文档入口，并更新 Google 真实联调与 Chrome 扩展已完成的状态。
