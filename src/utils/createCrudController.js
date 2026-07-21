import { ApiError } from './ApiError.js';
import { ApiResponse } from './ApiResponse.js';
import { asyncHandler } from './asyncHandler.js';
import { getPagination } from './pagination.js';

export function createCrudController(Model, options = {}) {
  const {
    select = '',
    populate = [],
    searchableFields = [],
    filterableFields = [],
    transformCreate = null,
    transformUpdate = null,
    idParam = 'id',
  } = options;

  const applyPopulate = (query) => {
    populate.forEach((path) => query.populate(path));
    return query;
  };

  const buildFilter = (query) => {
    const filter = {};

    filterableFields.forEach((field) => {
      if (query[field] !== undefined && query[field] !== '') {
        filter[field] = query[field];
      }
    });

    if (query.search && searchableFields.length > 0) {
      filter.$or = searchableFields.map((field) => ({
        [field]: { $regex: query.search, $options: 'i' },
      }));
    }

    return filter;
  };

  return {
    create: asyncHandler(async (req, res) => {
      let body = { ...req.body };

      if (transformCreate) {
        body = await transformCreate(body, req);
      }

      const document = await Model.create(body);
      let result = document;

      if (select || populate.length > 0) {
        result = await applyPopulate(Model.findById(document._id).select(select));
      }

      res.status(201).json(ApiResponse.success(result, 'Created successfully'));
    }),

    getAll: asyncHandler(async (req, res) => {
      const { page, limit, skip } = getPagination(req.query);
      const filter = buildFilter(req.query);

      const [data, total] = await Promise.all([
        applyPopulate(
          Model.find(filter).select(select).sort({ createdAt: -1 }).skip(skip).limit(limit)
        ),
        Model.countDocuments(filter),
      ]);

      res.json(ApiResponse.paginated(data, { page, limit, total }));
    }),

    getById: asyncHandler(async (req, res) => {
      const document = await applyPopulate(
        Model.findById(req.params[idParam]).select(select)
      );

      if (!document) {
        throw ApiError.notFound(`${Model.modelName} not found`);
      }

      res.json(ApiResponse.success(document));
    }),

    update: asyncHandler(async (req, res) => {
      let body = { ...req.body };

      if (transformUpdate) {
        body = await transformUpdate(body, req);
      }

      const document = await applyPopulate(
        Model.findByIdAndUpdate(req.params[idParam], body, {
          new: true,
          runValidators: true,
        }).select(select)
      );

      if (!document) {
        throw ApiError.notFound(`${Model.modelName} not found`);
      }

      res.json(ApiResponse.success(document, 'Updated successfully'));
    }),

    remove: asyncHandler(async (req, res) => {
      const document = await Model.findByIdAndDelete(req.params[idParam]);

      if (!document) {
        throw ApiError.notFound(`${Model.modelName} not found`);
      }

      res.json(ApiResponse.success(null, 'Deleted successfully'));
    }),
  };
}
