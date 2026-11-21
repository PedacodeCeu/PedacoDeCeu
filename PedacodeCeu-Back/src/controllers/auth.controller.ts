import { Request, Response } from "express";
import AuthService from "../services/auth.service";
import { LoginSchema } from "../dtos/auth.dto";
import { validar } from "../dtos/validar";

// Controllers só cuidam de HTTP: validam a entrada com o DTO, chamam o service e respondem.
// Erros (AppError) sobem sozinhos para o errorHandler — o Express 5 repassa as exceções dos handlers async.
class AuthController {
  static async login(req: Request, res: Response) {
    const dados = validar(LoginSchema, req.body);
    res.status(200).json(await AuthService.login(dados));
  }

  static async loginAdmin(req: Request, res: Response) {
    const dados = validar(LoginSchema, req.body);
    res.status(200).json(await AuthService.login(dados, true));
  }
}

export default AuthController;
