# TripCanvas Route Importer

这是 TripCanvas 的开发期 Chrome 扩展（Manifest V3）。它让你在 Google Maps 的地点详情页依次捕获站点，再将路线发送到本地 TripCanvas。

## 本地加载

1. Chrome 打开 `chrome://extensions`，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”。
3. 选择本目录 `extension`。
4. 打开 Google Maps 的地点详情页，点击扩展图标并选择“捕获当前 Google Maps 地点”。
5. 至少添加两个地点后，保持 TripCanvas 在 `http://127.0.0.1:5174` 的标签页打开，点击“发送到 TripCanvas”。

## 注意

- 扩展从 Google Maps URL 中提取 `@lat,lng`。它通常是地点或当前地图镜头坐标；发送前请在扩展弹窗中核对并修正。
- 扩展不读取帐号数据、不上传地点数据，也不包含 Google API Key。
- 当前仅允许发送到本地开发地址；发布前应将正式 TripCanvas 域名加入 `manifest.json` 的 `host_permissions` 与 `content_scripts.matches`。
