import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 3101);

app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "mcp-server-usdd", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.error(`@usdd/mcp-server-usdd HTTP server listening on port ${PORT}`);
});
