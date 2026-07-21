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
    // ownerScopes: map of { ROLE: fieldName }
    // e.g. { DEALER: 'dealerId', USER: 'parentId' }
    // A logged-in user whose role appears here can only see/create/edit/delete
    // records where [fieldName] === their own _id. ADMIN (or any role not
    // listed) is unrestricted.
    ownerScopes = {},
  } = options;

  const applyPopulate = (query) => {
    populate.forEach((path) => query.populate(path));
    return query;
  };

  const getOwnerScope = (req) => {
    const field = ownerScopes[req.user?.role];
    if (field) {
      return { [field]: req.user._id };
    }
    return null;
  };

  const buildFilter = (req) => {
    const filter = {};

    filterableFields.forEach((field) => {
      if (req.query[field] !== undefined && req.query[field] !== '') {
        filter[field] = req.query[field];
      }
    });

    if (req.query.search && searchableFields.length > 0) {
      filter.$or = searchableFields.map((field) => ({
        [field]: { $regex: req.query.search, $options: 'i' },
      }));
    }

    // Ownership scope always wins over any client-supplied value for that field —
    // a scoped role cannot override it via query params.
    const scope = getOwnerScope(req);
    if (scope) {
      Object.assign(filter, scope);
    }

    return filter;
  };

  return {
    create: asyncHandler(async (req, res) => {
      let body = { ...req.body };

      // Force ownership on create too — never trust the client's dealerId/parentId.
      const scope = getOwnerScope(req);
      if (scope) {
        Object.assign(body, scope);
      }

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
      const filter = buildFilter(req);

      const [data, total] = await Promise.all([
        applyPopulate(
          Model.find(filter).select(select).sort({ createdAt: -1 }).skip(skip).limit(limit)
        ),
        Model.countDocuments(filter),
      ]);

      res.json(ApiResponse.paginated(data, { page, limit, total }));
    }),

    getById: asyncHandler(async (req, res) => {
      const scope = getOwnerScope(req);
      const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

      const document = await applyPopulate(Model.findOne(filter).select(select));

      if (!document) {
        throw ApiError.notFound(`${Model.modelName} not found`);
      }

      res.json(ApiResponse.success(document));
    }),

    update: asyncHandler(async (req, res) => {
      let body = { ...req.body };

      const scope = getOwnerScope(req);
      if (scope) {
        Object.assign(body, scope);
      }

      if (transformUpdate) {
        body = await transformUpdate(body, req);
      }

      const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

      const document = await applyPopulate(
        Model.findOneAndUpdate(filter, body, {
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
      const scope = getOwnerScope(req);
      const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

      const document = await Model.findOneAndDelete(filter);

      if (!document) {
        throw ApiError.notFound(`${Model.modelName} not found`);
      }

      res.json(ApiResponse.success(null, 'Deleted successfully'));
    }),
  };
}