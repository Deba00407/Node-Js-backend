import { Router } from 'express';
import userServices from "../controllers/userControllers.ts";
import {authMiddleware} from "../middlewares/authMiddleware.ts";
import {authorize} from "../middlewares/validateRole.ts";

const router = Router();

router.post("/api/users/add-new", userServices.saveNewUser)
router.post("/api/user/login", userServices.login)
router.get("/api/users/all", authMiddleware, authorize("ADMIN"), userServices.getAllRegisteredUsers);
router.post("/api/user/refresh", authMiddleware, authorize("USER"), userServices.refreshAccessToken);

export default router;

