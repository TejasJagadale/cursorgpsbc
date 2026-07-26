// routes/licensePackage.routes.js
import { Router } from 'express';
import { licensePackageController } from '../controllers/licensePackage.controller.js';
import { authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// GET all license packages with order data
router.get('/', authorize(['ADMIN', 'DEALER']), licensePackageController.getAll);

// GET single license package with order data
router.get('/:id', authorize(['ADMIN', 'DEALER']), licensePackageController.getById);

// CREATE license package
router.post('/', authorize(['ADMIN']), licensePackageController.create);

// UPDATE license package
router.patch('/:id', authorize(['ADMIN']), licensePackageController.update);

// DELETE license package
router.delete('/:id', authorize(['ADMIN']), licensePackageController.remove);

export default router;