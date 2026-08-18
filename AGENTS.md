# TripCanvas Development Rules

## Product

TripCanvas（中文名“旅图”）是一个 AI 驱动的旅行路线图生成工具：将地点列表或旅行想法转化为可分享的小红书风格路线图。

当前优先目标是推进 Chrome Side Panel 创作体验：Google Maps 作为地图上下文，侧边栏统一管理标题、路径点、说明和图片，地图内画幅框负责构图预览，Web App 负责 Project JSON、真实路线和高清主图/副图导出。下一阶段让真实 AI 通过同一份路径点列表执行增删改。暂不做账户系统。

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand
- MapLibre GL JS
- react-konva / Konva
- html-to-image
- localStorage

## Architecture Rules

- 不要把业务逻辑放进 `App.tsx`。
- 所有领域类型放在 `src/types`，服务逻辑放在 `src/services`，全局客户端状态放在 `src/store`。
- 地图渲染与标注渲染必须分层；地图使用 MapLibre，叠加层使用 Konva。
- 地理绑定的地点和标注使用 `lng` / `lat` 持久化；仅标题、装饰等画布元素使用 `x` / `y`。
- 项目数据必须是可序列化的 Project JSON；v0.1 使用 localStorage 保存和恢复。
- 外部 API 响应在写入状态前必须校验并转换为领域类型。

## UX Rules

- 面向旅行内容创作者，而非 GIS 专家；优先清晰、轻量、可快速编辑的体验。
- PNG 导出是核心流程，开发时需要持续保证地图底图和标注可被可靠导出。
- 支持小红书常用比例：`3:4`、`4:5`、`9:16`。

## Coding Rules

- 使用 TypeScript 严格模式，避免 `any`。
- 组件保持小而专注；只为非显而易见的逻辑添加注释。
- 不要硬编码第三方 API Key；使用 `.env`，并维护 `.env.example`。
- 每完成一项功能，运行适当的类型检查、构建或测试，并记录结果。

## Development Flow

1. 阅读相关文件并确认现有改动。
2. 简要说明实现计划。
3. 做范围明确的修改。
4. 运行验证命令。
5. 更新 `docs/DEVELOPMENT_LOG.md`，记录变更、验证和风险。
