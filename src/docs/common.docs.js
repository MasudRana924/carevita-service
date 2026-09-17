/**
 * @swagger
 * components:
 *   schemas:
 *     ApiMeta:
 *       type: object
 *       properties:
 *         requestId: { type: string, format: uuid }
 *         timestamp: { type: string, format: date-time }
 *         path: { type: string, example: /api/v1/auth/login }
 *         pagination:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page: { type: integer, example: 1 }
 *         limit: { type: integer, example: 20 }
 *         total: { type: integer, example: 45 }
 *         totalPages: { type: integer, example: 3 }
 *         hasNext: { type: boolean, example: true }
 *         hasPrev: { type: boolean, example: false }
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         statusCode: { type: integer, example: 200 }
 *         message: { type: string, example: Success }
 *         data: {}
 *         meta:
 *           $ref: '#/components/schemas/ApiMeta'
 *     ErrorItem:
 *       type: object
 *       properties:
 *         field: { type: string, example: email }
 *         message: { type: string, example: Email is required }
 *         code: { type: string, example: REQUIRED }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         statusCode: { type: integer, example: 400 }
 *         message: { type: string, example: Validation failed }
 *         code: { type: string, example: VALIDATION_ERROR }
 *         errors:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ErrorItem'
 *         data: { nullable: true, example: null }
 *         meta:
 *           $ref: '#/components/schemas/ApiMeta'
 *   responses:
 *     Success:
 *       description: Successful response
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuccessResponse'
 *     BadRequest:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Authentication required
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: Access denied
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Conflict:
 *       description: Duplicate resource
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     TooManyRequests:
 *       description: Rate limited
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     ServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */
