import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res, next) => {
  void controller.register(req, res, next).catch(next);
});
router.post('/login', (req, res, next) => {
  void controller.login(req, res, next).catch(next);
});
router.post('/refresh', (req, res, next) => {
  void controller.refresh(req, res, next).catch(next);
});
router.post('/logout', (req, res, next) => {
  void controller.logout(req, res, next).catch(next);
});

router.get('/validate', (req, res, next) => {
  void controller.validate(req, res, next);
});

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

export { router as authRouter };
