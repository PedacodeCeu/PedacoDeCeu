import "dotenv/config";
import app from "./app";
import "./config/redis";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});