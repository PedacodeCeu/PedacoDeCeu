import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request } from "express";
import { BadRequestError } from "../errors/AppError";

const PASTA_UPLOADS = path.join(__dirname, "..", "..", "uploads", "produtos");

if (!fs.existsSync(PASTA_UPLOADS)) {
  fs.mkdirSync(PASTA_UPLOADS, { recursive: true });
}

const EXTENSOES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PASTA_UPLOADS);
  },
  filename: (_req, file, cb) => {
    const extensao = path.extname(file.originalname).toLowerCase();
    const nomeUnico = `${crypto.randomUUID()}${extensao}`;
    cb(null, nomeUnico);
  },
});

function filtroDeArquivo(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const extensao = path.extname(file.originalname).toLowerCase();

  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return cb(new BadRequestError("Extensão de arquivo não permitida. Use jpg, jpeg, png ou webp."));
  }

  if (!file.mimetype.startsWith("image/")) {
    return cb(new BadRequestError("O arquivo enviado não é uma imagem."));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroDeArquivo,
  limits: { fileSize: TAMANHO_MAXIMO },
});

// Apaga uma imagem da pasta de uploads. Arquivo que já não existe não é erro.
export async function removerImagem(nomeArquivo: string | null | undefined): Promise<void> {
  if (!nomeArquivo) return;
  try {
    await fs.promises.unlink(path.join(PASTA_UPLOADS, path.basename(nomeArquivo)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[upload] erro ao remover imagem:", (err as Error).message);
    }
  }
}

export default upload;
export { PASTA_UPLOADS, TAMANHO_MAXIMO };
