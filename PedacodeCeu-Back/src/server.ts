import "dotenv/config";
import app from "./app";
import "./config/redis";
import { iniciarAssinante } from "./services/eventos";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});

iniciarAssinante();