# RIVALS WEB FPS — 多人伺服器

已加入 Socket.IO 配對伺服器基礎：2 人配對佇列、房間建立、玩家位置/視角/武器狀態同步，以及射擊事件轉送。這還不是完整競技伺服器，尚無伺服器權威命中判定、帳號與排名資料庫、反作弊或評分配對。

## 本機啟動

```bash
npm install
npm start
```

預設網址為 `http://localhost:3000`，健康檢查為 `/health`。

## 部署

部署到支援常駐 Node.js 與 WebSocket 的平台，啟動命令使用 `npm start`。取得 HTTPS/WSS 伺服器網址後，前端需連線到該網址。GitHub Pages 只能提供靜態前端，不能執行這個 Node.js 伺服器。

## Socket.IO 事件

- `queue:join`：加入 2 人配對佇列，可傳入玩家名稱。
- `queue:status`：搜尋狀態。
- `match:found`、`match:ready`：配對與房間狀態。
- `player:update`：位置、視角與武器索引同步。
- `player:fire`：射擊提示轉送。
- `queue:leave`：離開佇列。

目前版本請視為多人連線原型，不具備正式公平競技或防作弊能力。