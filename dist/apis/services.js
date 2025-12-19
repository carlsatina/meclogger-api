"use strict";
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     StoreInfo:
 *       type: object
 *       required:
 *         - store_info
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the store info
 *         user_id:
 *           type: integer
 *           description: foreign key for user info
 *         store_name:
 *           type: string
 *           description: Name of the store that provides the services
 *         store_ads:
 *           type: string
 *           description: store ads
 *         store_history:
 *           type: string
 *           description: store history
 *         home_service:
 *           type: integer
 *           description: home service
 *         services:
 *           $ref: '#/components/schemas/Services'
 *         contact_number:
 *           $ref: '#/components/schemas/ContactNumber'
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         status:
 *           type: integer
 *           description: status
 *         decline_reason:
 *           type: string
 *           description: decline reason
 *         logo:
 *           type: string
 *           description: logo for the store.
 *
 *     ContactNumber:
 *       type: object
 *       required:
 *         - store_id
 *         - contact_no
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the contact number
 *         store_id:
 *           type: integer
 *           description: store id
 *         label:
 *           type: string
 *           description: phone label
 *         contact_no:
 *           type: string
 *           description: Store Contact number
 *
 *     Services:
 *       type: object
 *       required:
 *         - store_id
 *         - category
 *         - sub_category
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the contact number
 *         store_id:
 *           type: integer
 *           description: store id
 *         description:
 *           type: string
 *           description: List of services offered.
 *         category:
 *           type: string
 *           description: Main Category
 *         sub_category:
 *           type: string
 *           description: Sub Category
 *
 *     Address:
 *       type: object
 *       required:
 *         - store_id
 *         - address
 *         - city
 *         - barangay
 *         - zip_code
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the contact number
 *         store_id:
 *           type: integer
 *           description: store id
 *         address:
 *           type: string
 *           description: Address of the store/services
 *         city:
 *           type: string
 *           description: City
 *         barangay:
 *           type: string
 *           description: Barangay
 *         zip_code:
 *           type: string
 *           description: Zip Code
 */
/**
 * @swagger
 * tags:
 *      name: Services or Store Information
 *      description: API for Services
 *
 * /api/v1/services/:
 *      post:
 *          summary: Add store/services info
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/schemas/UserInfo'
 *
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 * /api/v1/services/search/:value:
 *      get:
 *          summary: Search for a service.
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: path
 *                name: value
 *                schema:
 *                    type: string
 *                required: true
 *                description: text to search for a service.
 *
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 * /api/v1/services/my_services:
 *      get:
 *          summary: Get all Services
 *          tags: [Services or Store Information]
 *          security:
 *              - bearerAuth: []
 *          parameters:
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: array
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 * /api/v1/services/{id}:
 *      get:
 *          summary: Get service with ID
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                    type: integer
 *                required: true
 *                description: Numeric ID of the service to get
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *      put:
 *          summary: Edit service with ID
 *          tags: [Services or Store Information]
 *          security:
 *              - bearerAuth: []
 *          parameters:
 *              - in: path
 *                name: id
 *                schema:
 *                    type: integer
 *                required: true
 *                description: Numeric ID of the service to get
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 *
 * /api/v1/services/:id/approve:
 *      put:
 *          summary: Approve service request.
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *              - in: path
 *                name: id
 *                schema:
 *                    type: integer
 *                required: true
 *                description: Numeric ID of the service to approved.
 *
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 * /api/v1/services/:id/decline:
 *      put:
 *          summary: Decline service request.
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *              - in: path
 *                name: id
 *                schema:
 *                    type: integer
 *                required: true
 *                description: Numeric ID of the service to decline.
 *
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/StoreInfo'
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 *
 * /api/v1/services/:id/upload:
 *      put:
 *          summary: Upload a brand logo or image.
 *          tags: [Services or Store Information]
 *          parameters:
 *              - in: header
 *                name: Authorization
 *                schema:
 *                    type: string
 *                    format: Bearer+Token
 *                required: true
 *              - in: path
 *                name: id
 *                schema:
 *                    type: integer
 *                required: true
 *                description: Numeric ID of the service to upload a logo.
 *
 *          requestBody:
 *              required: true
 *              content:
 *                  multipart/form-data:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              logo:
 *                                  type: string
 *                                  format: binary
 *          responses:
 *              201:
 *                  description: Success
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              404:
 *                  description: Not found
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              properties:
 *                                  status:
 *                                      type: int
 *                                      example: 400
 *                                  message:
 *                                      type: string
 *                                      example: string
 *              500:
 *                  description: Internal server error
 */ 
