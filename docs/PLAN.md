# TripCanvas 实施计划

## 目标与边界

第一版只验证“地点列表到可分享路线图”的闭环：不实现后端、账户系统、真实 AI 或浏览器插件。所有数据仅保存在浏览器 localStorage。

## 核心架构

```text
PlacesPanel
  → mock geocoding
  → TripCanvasProject（Zustand + localStorage）
  → MapLibre 底图 + 路线层
  → Konva 标注层
  → ExportFrame（html-to-image）
  → PNG
```

MapLibre 负责地理底图和视图状态；Konva 负责可选择、可拖拽的视觉标注。所有地理绑定元素存 `lng/lat`，渲染时根据当前地图视图转换到屏幕坐标，因此缩放、拖动不会产生偏移。

## 当前进度

- [x] 阶段 1：项目骨架
- [x] 阶段 2：地图与画布分层
- [x] 阶段 3：地点、标注与路线
- [x] 阶段 4：编辑体验
- [x] 阶段 5：PNG 导出与收尾
- [x] 阶段 6：Prompt → 已校验 Trip Draft 与 geocoding adapter
- [ ] 阶段 7：真实地点搜索与候选地点选择（adapter 已完成，生产端点待配置验证）
- [ ] 阶段 8：真实路线服务与直线 fallback（adapter 与 fallback 已完成，生产端点待验证）
- [x] 阶段 9：v0.3 路线模板与海报文案
- [x] 阶段 10：Carousel 预览与多图 ZIP 导出
- [x] 阶段 11：站点详情、页面编排与品牌水印
- [x] 阶段 12：Google Maps/Routes 与浏览器插件导入
- [x] 阶段 13：Chrome Side Panel 创作台与 Google Maps 构图框
- [ ] 阶段 14：AI 路径点操作、地点图片搜索与正式部署

## 阶段 1：项目骨架

**状态：已完成。**

**交付物**：Vite + React + TypeScript 工程、Tailwind、目录结构、领域类型、Zustand store、三栏编辑器布局。

- 初始化依赖并开启严格 TypeScript。
- 定义 `Place`、`Route`、`Annotation`、`TripCanvasProject`。
- 建立默认项目、编辑器状态和 localStorage 存储服务。
- 运行 `npm run build` 验证基础工程。

## 阶段 2：地图与画布分层

**状态：已完成。**

**交付物**：可拖拽缩放的 MapLibre 地图及同尺寸 Konva 叠加层。

- 实现 `MapLibreMap`、`TripCanvasEditor` 和 `AnnotationLayer`。
- 把 map center、zoom、bearing、pitch 同步到 store。
- 实现 `lngLatToScreen` / `screenToLngLat` 坐标转换接口。
- 验证浏览器中地图移动、缩放和叠加层对齐。

当前使用 Carto Positron 公共底图样式作为无 Key 的开发底图；在导出实现阶段需再次验证其跨域和使用条款是否适合生产导出。

## 阶段 3：地点、标注与路线

**状态：已完成。**

**交付物**：地点列表生成编号点位、标签及直线路线。

- 多行地点输入；使用东京固定坐标的 mock geocoding adapter。
- 根据地点创建 `Place`、pin annotation 和 label annotation。
- 自动 fit bounds；使用地点顺序创建直线 `Route.geometry`。
- 线路样式支持颜色、粗细、虚线和箭头。
- 验证刷新后数据恢复，且地图拖缩时点、线、标签仍对齐。

## 阶段 4：编辑体验

**状态：已完成。**

**交付物**：文本工具、选中状态和样式面板。

- 地图点击添加默认文字；拖拽结束后换算为 `lng/lat` 保存。
- 编辑文字、字号、颜色、背景、粗体和圆角。
- 删除当前选中元素；完善键盘与按钮的基础可访问性。
- 验证所有编辑持久化到 Project JSON。

## 阶段 5：PNG 导出与收尾

**状态：已完成。**

**交付物**：无编辑 UI 的小红书比例 PNG。

- 实现 `ExportFrame` 与 ExportPanel，提供 3:4、4:5、9:16 及对应 1080px 导出尺寸。
- 导出前确认地图已空闲且标注层已渲染，失败时给出可理解的提示。
- 文件名使用 `tripcanvas-YYYYMMDD-HHmm.png`。
- 做全链路手动验收和 `npm run build` 验证。

## 后续版本

| 版本 | 重点 | 依赖前提 |
| --- | --- | --- |
| v0.2 | Prompt → 已校验路线草案、真实地点搜索、真实路线 | v0.1 数据模型稳定 |
| v0.3 | City Walk 等模板、多图轮播、封面与水印 | 导出流程稳定 |

## 阶段 6：Prompt 草案与 geocoding 契约

**状态：已完成。**

- 使用 Zod 校验 `TripDraft`，确保标题、城市、主题、出行方式、地点和样式建议结构可靠。
- `parseTripPrompt` 当前使用本地 mock，只识别东京演示地点，不调用外部 AI。
- Prompt 生成的地点名称必须再次进入 geocoding，不接受 AI 直接生成的经纬度。
- geocoding 统一返回 `resolved`、`unresolved` 或 `needs-selection`。
- 未知地点不再循环套用固定坐标；UI 会显示具体未解析名称。

## 阶段 7：真实地点搜索

**状态：进行中。**

- 在现有 `GeocodingAdapter` 后接入一个真实服务。
- [x] 完成统一候选结果与用户确认 UI；只有选中的 `Place` 才进入 Project JSON。
- [x] 地点列表和 Prompt 两条入口复用同一套候选确认流程。
- [x] 实现支持 `city + placeName` 搜索的 Nominatim-compatible adapter，并加入响应校验、串行限速、缓存、超时和错误处理。
- [ ] 配置并验证可用于生产的真实服务端点。
- API Key 仅从环境变量读取；第三方响应先校验再转换为 `Place`。
- 公共 Nominatim 实例有频率、用途及可切换性限制，不作为硬编码的生产默认服务。

## 阶段 8：真实路线规划

**状态：进行中。**

- [x] 为 `calculateRoute` 定义统一输入输出，第一版支持 walking 和 driving。
- [x] 实现 OSRM-compatible adapter，把 GeoJSON 转换为统一 geometry、distanceMeters 与 durationSeconds。
- [x] API 未配置、失败或返回无效数据时保留直线 polyline fallback。
- [x] 手动地点入口可选择步行或驾车；Prompt 复用识别出的 travelMode。
- [x] 右侧显示路线来源、实际出行方式、总距离和预计时间。
- [ ] 配置并验证生产可用的 walking / driving 路线端点。

## 阶段 9：v0.3 路线模板与海报文案

**状态：已完成。**

- 新增城市漫步、一日精华、咖啡巡游和拍照机位四套模板。
- 模板作为 `templateId` 保存到 Project JSON，并随 localStorage 恢复。
- 模板统一控制画布比例、导出尺寸、路线色、Pin、标签、标题区域、副标题和 Badge。
- 新生成的地点与路线自动继承当前模板，不恢复为默认视觉。
- 海报标题和副标题可在左侧直接编辑。
- 修复高比例画布垂直居中导致 9:16 顶部无法滚动的问题。

**阶段 10 目标（已完成）：**

- 设计封面图、路线图、站点详情图的数据结构。
- 实现多图 carousel 预览与批量 PNG 导出。
- 增加可配置品牌水印。

## 阶段 10：Carousel 预览与多图 ZIP 导出

**状态：已完成。**

- 从 Project JSON 自动派生封面、路线和每个站点的详情页。
- 右侧多图素材面板显示页面顺序、类型、数量和选中页摘要。
- 封面展示城市、模板、标题、副标题、地点数、距离和时间。
- 详情页展示编号、地点分类、名称、地址、备注和行程进度。
- 路线页复用现有 MapLibre + Konva 导出画布，不复制地图状态。
- 使用 JSZip 顺序打包 PNG，文件名为 `01-cover`、`02-route`、`03-place-01` 等。
- 实际浏览器下载和解包验证通过；四张 9:16 PNG 均可正常打开。
- 视觉抽查后修复封面、路线和详情页短标签被 Flex 压缩换行的问题。

## 阶段 11：站点详情、页面编排与品牌水印

**状态：已完成。**

- 品牌水印支持开关、文字、位置和透明度，并同时进入单图与 ZIP。
- 站点支持名称、地址、分类、攻略文案和外部链接编辑。
- Carousel 页面可独立包含/排除并前后排序，ZIP 文件顺序与 UI 一致。

## 阶段 12：Google Maps/Routes 与插件多点导入

**状态：已完成。**

- 可选 Google Maps JavaScript API 地图模式；Google Routes 只在 Google 底图启用时工作。
- 使用新 `Route.computeRoutes()` 获取完整 path、总距离、总时间和 waypoint 对应的 legs。
- Route Project JSON 保存逐段 geometry、distanceMeters 与 durationSeconds。
- 逐段时间显示在右侧面板，并以气泡叠加在可导出的 Konva 画布。
- Google 导出模式使用 Static Maps 图片作为底图，避免动态地图瓦片无法进入 html-to-image。
- 新增经过 Zod 校验的 `TRIPCANVAS_IMPORT_ROUTE` 插件消息，可导入最多 27 个带说明和外链的站点。
- 编辑态站点标签可点击打开 Google Maps；外链仅允许 http/https。
- Google Maps、Routes 和 Static Maps 已使用本地环境变量中的 Key 进行真实验证。
- `extension/` 提供 Manifest V3 开发期扩展：可依次捕获 Google Maps 地点，在弹窗中检查坐标并将多点路线发送给本地 TripCanvas。

## 技术风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 地图 Canvas 受跨域资源限制，导出失败 | PNG 核心能力不可用 | 尽早用真实底图测试；必要时用可导出的静态地图或服务端截图方案 |
| MapLibre 与 Konva 的像素密度/尺寸不一致 | 点位、路线发生偏移 | 以同一容器尺寸驱动两层，并在 resize 后同步更新 |
| 只保存屏幕坐标 | 拖动或缩放后标注错位 | 地理绑定元素一律存 `lng/lat` |
| 地点同名或找不到 | 路线错误 | 后续 geocoding 返回候选项并要求用户确认 |
| 真实路线 API 失败或成本上升 | 体验与成本不稳定 | 统一服务接口、直线 polyline fallback、密钥放环境变量 |
| 外部地点图片不允许 CORS | 副图预览正常但导出失败 | 校验图片来源；生产版通过受控图片代理或 Places Photos adapter 转换 |

## 阶段 13：Chrome Side Panel 创作台

**状态：已完成第一阶段。**

- 扩展从小弹窗升级为 Chrome Side Panel，点击扩展图标后可持续编辑。
- 标题、副标题、画幅比例、出行方式和路径点列表保存在扩展本地项目状态中。
- 路径点以模块化卡片呈现，可编辑名称、经纬度、说明和图片 URL，也可点击 `×` 删除。
- Google Maps 页面叠加可开关的画幅框，同步预览标题、副标题、比例和路径点摘要。
- 导入契约支持副标题、画幅和地点图片；Web App 生成一张路线主图与每点一张详情副图。
- AI 入口只操作该路径点数组；真实模型尚未接入，不建立第二套 AI 草案状态。

## 阶段 14：AI 与地点素材

- 定义 AI route operations schema，例如 `addPlace`、`removePlace`、`movePlace`、`updatePlace`。
- AI 生成地点名称后必须经过 Google Places 搜索和候选确认，再获得坐标与图片。
- 地点图片进入统一素材结构，支持用户选择、替换和删除；处理 CORS、归属和导出稳定性。
- [x] Side Panel 支持路径点拖拽排序，并提供键盘可操作的上移/下移按钮。
- [x] Side Panel 通过 Web App 的 Google Key 调用 Places Text Search，并显示精确地点候选；候选确认后才写入路径点。
- [x] 路径点卡片默认折叠，仅显示名称与必要排序/删除操作，展开后编辑完整内容。
- [x] 地图预览使用按钮触发 Google Routes 计算，并把真实 geometry、编号、距离与时间投影到画幅框。
- [x] 标题、副标题和画幅比例从 Side Panel 移到 Google Maps 预览框内直接编辑，并同步保存到扩展项目。

## 第一轮实现顺序

1. 初始化 Vite 与依赖，创建目录和类型。
2. 完成 Zustand project/editor store 与 localStorage 服务。
3. 建立三栏布局和空编辑器区域。
4. 执行构建验证，记录到开发日志。

## v0.1 完成后建议

1. 为 mock geocoding 与直线路线服务添加适配器接口，接入真实服务前不修改 UI 与领域类型。
2. 在目标设备上抽样测试 1080px PNG 导出，确认 Carto 底图可被浏览器安全地捕获。
3. 在功能稳定后为 MapLibre / Konva 做懒加载，降低首次包体体积。
