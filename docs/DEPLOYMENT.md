# TripCanvas 部署与 Google Maps 配置

本文件说明 TripCanvas 上线时的环境变量、Google Maps Platform Key 限制与密钥轮换流程。仓库和部署日志中都不能保存真实 Key。

## 环境变量

在部署平台的 Secret / Environment Variables 设置中配置：

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_restricted_key
VITE_MAP_PROVIDER=google
VITE_ROUTING_PROVIDER=google
```

本地开发时，将同样的变量放入未提交的 `.env.local`。`.env.local` 已在 `.gitignore` 中，禁止手动添加到 Git。

注意：`VITE_` 前缀变量会被打包到浏览器端。这是 Google Maps JavaScript API 的正常接入方式，因此 Key 的安全性依赖 Google Cloud Console 的应用和 API 限制，而不是隐藏在前端代码中。

## Google Cloud Console 配置

在使用该 Key 的同一个 Google Cloud 项目中：

1. 启用计费。
2. 启用以下 API：
   - Maps JavaScript API
   - Routes API
   - Maps Static API
   - Places API (New)
3. 在 **Credentials → API key → Application restrictions** 选择 **Websites**。
4. 添加允许的 HTTP Referrer：
   - 本地开发：`http://127.0.0.1:5174/*`
   - 如使用 localhost：`http://localhost:5174/*`
   - 生产环境：`https://你的正式域名/*`
5. 在 **API restrictions** 选择 **Restrict key**，且仅勾选上面的四个 API。

请不要为了排障长期保留“无应用限制”或“不要限制 Key”。如确实需要临时测试，应立即恢复限制。

## 上线前验证

部署完成后，用受限 Key 在正式域名逐项检查：

- Google 地图可以加载，且保留 Google 官方归属。
- Side Panel 搜索地点时，Places API（New）能返回名称、地址、Place ID 和精确坐标候选。
- 导入至少两个地点后，Google Routes 能返回道路路线、总距离、总时间和逐段 ETA。
- 导出的 PNG 包含 Static Maps 底图、路线、站点编号、标签与逐段时间。
- Chrome 扩展的 `manifest.json` 已加入正式 TripCanvas 域名，再重新加载扩展。

## 密钥轮换与泄露处理

若 Key 被发到聊天、截图、Issue、日志或提交历史中，应视为可能泄露：

1. 在 Google Cloud Console 新建一个受限 Key。
2. 用新值更新部署平台的环境变量和本机 `.env.local`。
3. 重新部署，并按“上线前验证”检查。
4. 禁用或删除旧 Key。
5. 检查 Git 历史、构建日志与公开文档，确认没有真实 Key。

当前项目在推送时排除了 `.env.local`；正式发布前仍建议轮换此前用于本地联调的 Key。

## AI 路线服务

- Set `VITE_AI_ROUTE_ENDPOINT` to a same-origin or CORS-enabled server endpoint that follows `docs/AI_ROUTE_API.md`.
- Store the model provider key only on that server. Never use a `VITE_` variable for an OpenAI, Gemini, or other model secret.
- The AI endpoint proposes names, order, travel modes, and short notes. Google Places remains the source of Place IDs, coordinates, photos, and attributions; Google Routes remains the source of geometry and travel time.
- Google Places photo URIs must be refreshed and must not be treated as permanently cacheable media.
