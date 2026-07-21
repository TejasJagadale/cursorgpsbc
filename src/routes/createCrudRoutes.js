import { Router } from 'express';

export function createCrudRoutes(controller) {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.patch('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
