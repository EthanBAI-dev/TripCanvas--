# TripCanvas Route Importer

这是 TripCanvas 的开发期 Chrome 扩展（Manifest V3）。扩展以 Chrome 侧边栏作为主要创作界面，让你在 Google Maps 中组织路线点、说明、图片和标题，并用地图上的画幅框预览主图构图。

## 本地加载

1. Chrome 打开 `chrome://extensions`，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”。
3. 选择本目录 `extension`。
4. 打开 Google Maps，点击扩展图标打开 TripCanvas 侧边栏。
5. 在地点详情页点击“添加当前 Google Maps 地点”，路径点卡片默认折叠，仅显示名称；展开后可编辑说明、图片和坐标，也可拖拽排序或点击 `×` 删除。
6. 直接在 Google Maps 蓝色画幅框中输入标题、副标题，并选择 3:4、4:5 或 9:16；侧边栏不再重复显示这些画面属性。
7. 点击“更新真实路线预览”，扩展会让 Google Maps 打开对应的多点导航并适配视野，同时在画幅框叠加 TripCanvas 折线、编号、距离和时间。
7. 至少添加两个地点后，保持 TripCanvas 在 `http://127.0.0.1:5174` 的标签页打开，点击“生成高清主图与副图”。

## 注意

- 扩展从 Google Maps URL 中提取 `@lat,lng`。它通常是地点或当前地图镜头坐标；发送前请在扩展弹窗中核对并修正。
- AI 规划入口当前保留同一份路径点状态接口，尚未连接真实模型；未来 AI 只会添加、删除或调整路径点。
- 扩展不读取帐号数据、不上传地点数据，也不包含 Google API Key。
- 当前仅允许发送到本地开发地址；发布前应将正式 TripCanvas 域名加入 `manifest.json` 的 `host_permissions` 与 `content_scripts.matches`。
