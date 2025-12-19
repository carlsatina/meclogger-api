/**
 * @swagger
 * components:
 *   schemas:
 *     UserInfo:
 *       type: object
 *       required:
 *         - store_info
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the book
 *         facebookd_id:
 *           type: string
 *           description: Facebook ID for facebook login
 *         google_id:
 *           type: string
 *           description: Google ID for google login
 *         full_name:
 *           type: string
 *           description: User fullname
 *         email:
 *           type: string
 *           description: User email
 *         password:
 *           type: string
 *           description: User password
 *         contact_number:
 *           type: string
 *           description: user contact number
 *         status:
 *           type: integer
 *           description: User status if active or not
 *         is_admin:
 *           type: integer
 *           description: flag if user is admin or not
 *         store_info:
 *           $ref: '#/components/schemas/StoreInfo'
 */
/**

/**
 * @swagger
 * tags:
 *      name: User Authentication
 *      description: User Authentication managing API       
 * /api/v1/auth/login:
 *      post:
 *          summary: Login with user email and password
 *          tags: [User Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              email:
 *                                  type: int
 *                                  example: user@email.com
 *                              password:
 *                                  type: string
 *                                  example: pass1234
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
 *                                      example: 201
 *                                  token:
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
 * /api/v1/auth/fbLogin:
 *      post:
 *          summary: Login with Facebook
 *          tags: [User Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              facebook_id:
 *                                  type: string
 *                                  example: 12345678
 *                              name:
 *                                  type: string
 *                                  example: username
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
 *                                      example: 201
 *                                  token:
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
 * /api/v1/auth/googleLogin:
 *      post:
 *          summary: Login with Google
 *          tags: [User Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              email:
 *                                  type: string
 *                                  example: user@gmail.com
 *                              sub:
 *                                  type: string
 *                                  example: 1234567890
 *                              name:
 *                                  type: string
 *                                  example: fullname
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
 *                                      example: 201
 *                                  token:
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
 * /api/v1/auth/register:
 *      post:
 *          summary: Register a User
 *          tags: [User Authentication]
 *          requestBody:
 *              required: true
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              email:
 *                                  type: string
 *                                  example: user@gmail.com
 *                              password:
 *                                  type: string
 *                                  example: pass1234
 *                              verifyPassword:
 *                                  type: string
 *                                  example: pass1234
 *                              full_name:
 *                                  type: string
 *                                  example: fullname
 *                              contact_number:
 *                                  type: string
 *                                  example: contact number
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
 *                                      example: 201
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
 * /api/v1/auth/profile:
 *      get:
 *          summary: Get Profile Info
 *          tags: [User Authentication]
 *          responses:
 *              200:
 *                  description: Profile Info
 *                  content:
 *                      application/json:
 *                          schema:
 *                              type: object
 *                              $ref: '#/components/schemas/UserInfo'
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