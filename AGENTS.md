# mcp-server-usdd 项目研发约束

面向 TRON/Ethereum/BNB 的 USDD MCP 服务，提供协议查询与受控的钱包操作入口。

## 协作方式

- 先读本文件和 README，再查看受影响模块；需求明确时直接实施，多步骤任务简述顺序并继续，只有关键歧义才询问。
- 简单任务不另建设计/计划文档；复杂任务只记录必要决策、依赖、风险和验证，不默认逐阶段审批、逐节确认或逐 Task 提交。
- 改动后运行相关的真实验证命令；只改文档时检查相对链接和 `git diff --check`，无须启动应用。测试缺依赖或未执行时如实说明。
- 业务、架构、接口、配置或 schema 变化同步 README、AGENTS 和相关详细文档；历史设计/计划只作背景，不能覆盖当前代码与已确认需求。
- 仅暂存本次文件，保留他人改动；提交遵循现有仓库规范。密钥、Token、真实敏感端点、运行数据和构建产物不进入提交。

## 项目边界

src/index.ts 或 src/server/http-server.ts → core 工具 → 链适配/钱包 → RPC 与协议合约。

- 保留交易 preview/confirm 与工具参数校验边界；普通查询不得附带签名或转账副作用。
- 严格区分网络、chain ID、地址编码、decimals 和金额单位，钱包凭据不进入响应与日志。
- stdio 模式的 stdout 仅用于协议，诊断写 stderr；HTTP 模式保留已有认证和传输边界。

## 环境与验证

Node.js 24.22.1（.nvmrc 与版本检查固定）；npm ci。

```bash
npm test
npm run build
git diff --check
```


## 文档入口

- [README](README.md)
