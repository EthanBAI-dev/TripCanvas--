# TripCanvas Route Importer

这是 TripCanvas 的 Chrome Side Panel 扩展（Manifest V3）。扩展以侧边栏作为主要创作界面，让你在 Google Maps 中组织路线点、说明、图片和标题，并用地图上的画幅框预览主图构图。

地点搜索、AI 规划和真实路线由 TripCanvas API 服务完成，不依赖打开 TripCanvas Web App。Web App 仅保留为可选的高级编辑与高清多图导出入口。

## 本地加载

1. Chrome 打开 `chrome://extensions`，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”。
3. 选择本目录 `extension`。
4. 打开 Google Maps，点击扩展图标打开 TripCanvas 侧边栏。
5. 在地点详情页点击“添加当前 Google Maps 地点”，路径点卡片默认折叠，仅显示名称和到达方式；展开后可设置“前往此点：步行/驾车”，并编辑说明、图片和坐标，也可拖拽排序或点击 `×` 删除。
6. 直接在 Google Maps 蓝色画幅框中输入标题、副标题，并选择 3:4、4:5 或 9:16；侧边栏不再重复显示这些画面属性。
7. 点击“更新真实路线预览”，扩展会直接请求 TripCanvas API，并按全部路径点和路线边界自动缩放、平移，再显示分段路线、编号、距离和时间。
8. 点击蓝色预览框顶部的“📸 快照”，会播放快门闪光与轻微缩放特效，并下载 3:4、4:5 或 9:16 PNG。快照使用隐藏 Google 底图文字的 Static Maps，只叠加路线、编号和路径点名称。
9. 如需继续精细编辑或导出多张高清副图，再打开 Web App 并点击“发送到高级编辑器（可选）”。

## 注意

- 扩展从 Google Maps URL 中提取 `@lat,lng`。它通常是地点或当前地图镜头坐标；发送前请在扩展弹窗中核对并修正。
- AI 规划会把旅行想法发送到 TripCanvas API；服务端调用 DeepSeek，再用 Google Places 和 Routes 校准结果。扩展包不包含 DeepSeek 或 Google API Key。
- 开发版 API 地址为 `http://127.0.0.1:5174`，只要求启动服务，不要求打开网页。发布版应替换为 HTTPS API 域名，并将该域名加入 `manifest.json` 的 `host_permissions`。
- “添加当前 Google Maps 地点”和预览框需要打开 Google Maps；搜索、编辑路径点本身不依赖 TripCanvas Web App。
- 快照下载使用 Chrome `downloads` 权限；Static Maps 图片保留 Google 自带的品牌与法律归属。
