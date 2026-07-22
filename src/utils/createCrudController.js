// import { ApiError } from './ApiError.js';
// import { ApiResponse } from './ApiResponse.js';
// import { asyncHandler } from './asyncHandler.js';
// import { getPagination } from './pagination.js';

// export function createCrudController(Model, options = {}) {
//   const {
//     select = '',
//     populate = [],
//     searchableFields = [],
//     filterableFields = [],
//     transformCreate = null,
//     transformUpdate = null,
//     afterCreate = null, // Add this new option
//     idParam = 'id',
//     ownerScopes = {},
//   } = options;

//   const applyPopulate = (query) => {
//     populate.forEach((path) => query.populate(path));
//     return query;
//   };

//   const getOwnerScope = (req) => {
//     const field = ownerScopes[req.user?.role];
//     if (field) {
//       return { [field]: req.user._id };
//     }
//     return null;
//   };

//   const buildFilter = (req) => {
//     const filter = {};

//     filterableFields.forEach((field) => {
//       if (req.query[field] !== undefined && req.query[field] !== '') {
//         filter[field] = req.query[field];
//       }
//     });

//     if (req.query.search && searchableFields.length > 0) {
//       filter.$or = searchableFields.map((field) => ({
//         [field]: { $regex: req.query.search, $options: 'i' },
//       }));
//     }

//     // Ownership scope always wins over any client-supplied value for that field —
//     // a scoped role cannot override it via query params.
//     const scope = getOwnerScope(req);
//     if (scope) {
//       Object.assign(filter, scope);
//     }

//     return filter;
//   };

//   return {
// create: asyncHandler(async (req, res) => {
//   console.log('=== CREATE CONTROLLER START ===');
//   let body = { ...req.body };
//   console.log('Original body:', JSON.stringify(body, null, 2));
//   console.log('User role:', req.user?.role);
//   console.log('User ID:', req.user?._id);

//   // Force ownership on create too — never trust the client's dealerId/parentId.
//   const scope = getOwnerScope(req);
//   console.log('Owner scope:', scope);
//   if (scope) {
//     Object.assign(body, scope);
//     console.log('After applying owner scope:', JSON.stringify(body, null, 2));
//   }

//   if (transformCreate) {
//     console.log('Calling transformCreate...');
//     body = await transformCreate(body, req);
//     console.log('After transformCreate:', JSON.stringify(body, null, 2));
//   }

//   // Validate required fields before creating
//   console.log('Validating required fields...');
//   const requiredFields = Object.keys(Model.schema.paths).filter(
//     path => Model.schema.paths[path].isRequired
//   );
//   console.log('Required fields:', requiredFields);
  
//   const missingFields = requiredFields.filter(field => {
//     const value = body[field];
//     return value === undefined || value === null || value === '';
//   });
  
//   if (missingFields.length > 0) {
//     console.log('Missing required fields:', missingFields);
//     throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
//   }

//   console.log('Creating document...');
//   try {
//     const document = await Model.create(body);
//     console.log('Document created:', document._id);
    
//     if (afterCreate) {
//       console.log('Calling afterCreate hook...');
//       await afterCreate(document, req);
//       console.log('afterCreate hook completed');
//     } else {
//       console.log('No afterCreate hook defined');
//     }

//     let result = document;

//     if (select || populate.length > 0) {
//       result = await applyPopulate(Model.findById(document._id).select(select));
//     }

//     console.log('=== CREATE CONTROLLER END ===');
//     res.status(201).json(ApiResponse.success(result, 'Created successfully'));
//   } catch (error) {
//     console.error('Error creating document:', error);
//     console.error('Error details:', {
//       message: error.message,
//       stack: error.stack,
//       errors: error.errors
//     });
//     throw error;
//   }
// }),

//     getAll: asyncHandler(async (req, res) => {
//       const { page, limit, skip } = getPagination(req.query);
//       const filter = buildFilter(req);

//       const [data, total] = await Promise.all([
//         applyPopulate(
//           Model.find(filter).select(select).sort({ createdAt: -1 }).skip(skip).limit(limit)
//         ),
//         Model.countDocuments(filter),
//       ]);

//       res.json(ApiResponse.paginated(data, { page, limit, total }));
//     }),

//     getById: asyncHandler(async (req, res) => {
//       const scope = getOwnerScope(req);
//       const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

//       const document = await applyPopulate(Model.findOne(filter).select(select));

//       if (!document) {
//         throw ApiError.notFound(`${Model.modelName} not found`);
//       }

//       res.json(ApiResponse.success(document));
//     }),

//     update: asyncHandler(async (req, res) => {
//       let body = { ...req.body };

//       const scope = getOwnerScope(req);
//       if (scope) {
//         Object.assign(body, scope);
//       }

//       if (transformUpdate) {
//         body = await transformUpdate(body, req);
//       }

//       const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

//       const document = await applyPopulate(
//         Model.findOneAndUpdate(filter, body, {
//           new: true,
//           runValidators: true,
//         }).select(select)
//       );

//       if (!document) {
//         throw ApiError.notFound(`${Model.modelName} not found`);
//       }

//       res.json(ApiResponse.success(document, 'Updated successfully'));
//     }),

//     remove: asyncHandler(async (req, res) => {
//       const scope = getOwnerScope(req);
//       const filter = scope ? { _id: req.params[idParam], ...scope } : { _id: req.params[idParam] };

//       const document = await Model.findOneAndDelete(filter);

//       if (!document) {
//         throw ApiError.notFound(`${Model.modelName} not found`);
//       }

//       res.json(ApiResponse.success(null, 'Deleted successfully'));
//     }),
//   };
// }


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
    afterCreate = null, // Add this new option
    idParam = 'id',
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
  console.log('=== CREATE CONTROLLER START ===');
  let body = { ...req.body };
  console.log('Original body:', JSON.stringify(body, null, 2));
  console.log('User role:', req.user?.role);
  console.log('User ID:', req.user?._id);

  // Force ownership on create too — never trust the client's dealerId/parentId.
  const scope = getOwnerScope(req);
  console.log('Owner scope:', scope);
  if (scope) {
    Object.assign(body, scope);
    console.log('After applying owner scope:', JSON.stringify(body, null, 2));
  }

  if (transformCreate) {
    console.log('Calling transformCreate...');
    body = await transformCreate(body, req);
    console.log('After transformCreate:', JSON.stringify(body, null, 2));
  }

  // Note: we intentionally don't do a manual "required fields" pre-check here.
  // Model.schema.paths flattens nested/grouped subdocuments (e.g. LicensePackage's
  // `duration` becomes `duration.value` / `duration.unit`), but the submitted body
  // still nests that data under `body.duration.value` — so a flat `body[field]`
  // lookup on a dotted path is always undefined and incorrectly flags present data
  // as missing. Mongoose's own schema validation (triggered by Model.create below)
  // already handles nested paths, defaults, and required checks correctly, and the
  // global error handler formats ValidationErrors per-field for the client.
  console.log('Creating document...');
  try {
    const document = await Model.create(body);
    console.log('Document created:', document._id);
    
    if (afterCreate) {
      console.log('Calling afterCreate hook...');
      await afterCreate(document, req);
      console.log('afterCreate hook completed');
    } else {
      console.log('No afterCreate hook defined');
    }

    let result = document;

    if (select || populate.length > 0) {
      result = await applyPopulate(Model.findById(document._id).select(select));
    }

    console.log('=== CREATE CONTROLLER END ===');
    res.status(201).json(ApiResponse.success(result, 'Created successfully'));
  } catch (error) {
    console.error('Error creating document:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });
    throw error;
  }
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