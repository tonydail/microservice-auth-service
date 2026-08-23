import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  AuthServiceRegisterResponse,
} from '../types/auth.types';
import { ApiResponse } from '../types/apiResponse';
export class AuthController {
  private readonly authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RegisterSchema.parse(req.body);
      const response = await this.authService.register(dto);
      const apiResponse = ApiResponse.Success<AuthServiceRegisterResponse>(response);
      res.status(201).json(apiResponse);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = LoginSchema.parse(req.body);
      const tokens = await this.authService.login(dto);
      const apiResponse = ApiResponse.Success(tokens);
      res.status(200).json(apiResponse.unwrap());
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = RefreshTokenSchema.parse(req.body);
      const tokens = await this.authService.refresh(refreshToken);
      const apiResponse = ApiResponse.Success(tokens);
      res.status(200).json(apiResponse.unwrap());
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

  validate = (req: Request, res: Response): void => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(400).json(ApiResponse.Failure('Authorization header missing'));
        return;
      }
      const isValid = this.authService.validate(token);
      isValid ? res.status(200).send() : res.status(401).send();
    } catch (err) {
      res.status(401).send();
    }
  };
}
