import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../types/auth.types';

export class AuthController {
  private readonly authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RegisterSchema.parse(req.body);
      const tokens = await this.authService.register(dto);
      res.status(201).json(tokens);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = LoginSchema.parse(req.body);
      const tokens = await this.authService.login(dto);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      const tokens = await this.authService.refresh(refreshToken);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      await this.authService.logout(refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
