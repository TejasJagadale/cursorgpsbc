import { Router } from 'express';
import { shareSubUser, revokeShare, getMySharedAccess } from '../controllers/subUserAccess.controller.js';

const router = Router();

router.post('/share', shareSubUser);
router.delete('/revoke', revokeShare);
router.get('/my-access', getMySharedAccess);

export default router;