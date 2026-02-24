import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'UBUTABERAhub Legal Platform API',
      version: '2.1.0',
      description: 'Rwanda Digital Justice Platform - Production API Documentation',
      contact: {
        name: 'API Development Team',
        email: 'api-team@ubutaberahub.rw',
        url: 'https://docs.ubutaberahub.rw'
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      },
      {
        url: 'https://api.ubutaberahub.rw',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authentication Token'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          required: ['success', 'timestamp'],
          properties: {
            success: {
              type: 'boolean',
              description: 'Request success status',
              example: true
            },
            message: {
              type: 'string',
              description: 'Human-readable message',
              example: 'Operation completed successfully'
            },
            data: {
              oneOf: [
                { type: 'object' },
                { type: 'array' },
                { type: 'null' }
              ],
              description: 'Response payload'
            },
            meta: {
              type: 'object',
              properties: {
                pagination: { $ref: '#/components/schemas/PaginationInfo' },
                requestId: {
                  type: 'string',
                  description: 'Unique request identifier',
                  example: 'req_1a2b3c4d5e'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },

        ErrorResponse: {
          type: 'object',
          required: ['success', 'error', 'timestamp'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  description: 'Machine-readable error code',
                  example: 'VALIDATION_FAILED'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'Request validation failed'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string', example: 'email' },
                      message: { type: 'string', example: 'Invalid email format' }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                path: { type: 'string' },
                method: { type: 'string' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },

        PaginationInfo: {
          type: 'object',
          required: ['page', 'limit', 'total', 'totalPages'],
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Items per page',
              example: 20
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
              example: 150
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
              example: 8
            },
            hasNext: {
              type: 'boolean',
              description: 'Has next page',
              example: true
            },
            hasPrev: {
              type: 'boolean',
              description: 'Has previous page',
              example: false
            }
          }
        },

        User: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.mugisha@ubutaberahub.rw'
            },
            firstName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'First name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Last name',
              example: 'Mugisha'
            },
            phone: {
              type: 'string',
              nullable: true,
              pattern: '^\\\\+250[0-9]{9}$',
              description: 'Rwandan phone number',
              example: '+250788123456'
            },
            role: {
              type: 'string',
              enum: ['client', 'lawyer', 'judge', 'clerk', 'admin'],
              description: 'User role in system',
              example: 'client'
            },
            isVerified: {
              type: 'boolean',
              description: 'Email verification status',
              example: true
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status',
              example: true
            },
            profilePicture: {
              type: 'string',
              nullable: true,
              format: 'uri',
              description: 'Profile picture URL',
              example: 'https://cdn.ubutaberahub.rw/avatars/john.jpg'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2024-01-01T00:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },

        Lawyer: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              required: ['barNumber', 'specialization', 'experience'],
              properties: {
                barNumber: {
                  type: 'string',
                  pattern: '^RBA-[0-9]{4}-[0-9]{4}$',
                  description: 'Rwanda Bar Association number',
                  example: 'RBA-2023-0456'
                },
                specialization: {
                  type: 'string',
                  enum: [
                    'criminal-law', 'civil-law', 'family-law', 'corporate-law',
                    'property-law', 'immigration-law', 'constitutional-law',
                    'human-rights-law', 'tax-law', 'environmental-law',
                    'labor-law', 'intellectual-property-law'
                  ],
                  description: 'Primary legal specialization',
                  example: 'criminal-law'
                },
                experience: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 50,
                  description: 'Years of legal experience',
                  example: 8
                },
                rating: {
                  type: 'number',
                  minimum: 0,
                  maximum: 5,
                  description: 'Average client rating',
                  example: 4.5
                },
                hourlyRate: {
                  type: 'number',
                  minimum: 0,
                  description: 'Hourly consultation rate in RWF',
                  example: 25000
                }
              }
            }
          ]
        },

        Case: {
          type: 'object',
          required: ['id', 'clientId', 'title', 'description', 'category', 'status', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001'
            },
            clientId: {
              type: 'string',
              format: 'uuid',
              description: 'Client user ID',
              example: '550e8400-e29b-41d4-a716-446655440002'
            },
            lawyerId: {
              type: 'string',
              nullable: true,
              format: 'uuid',
              description: 'Assigned lawyer ID',
              example: '550e8400-e29b-41d4-a716-446655440003'
            },
            title: {
              type: 'string',
              minLength: 5,
              maxLength: 200,
              description: 'Case title',
              example: 'Property Boundary Dispute'
            },
            description: {
              type: 'string',
              minLength: 50,
              maxLength: 5000,
              description: 'Detailed case description',
              example: 'Dispute over land boundary between neighboring properties'
            },
            category: {
              type: 'string',
              enum: ['criminal', 'civil', 'family', 'corporate', 'property', 'immigration', 'other'],
              description: 'Case category',
              example: 'property'
            },
            status: {
              type: 'string',
              enum: ['open', 'in_progress', 'closed', 'cancelled'],
              default: 'open',
              description: 'Case status',
              example: 'open'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium',
              description: 'Case priority level',
              example: 'medium'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T11:30:00.000Z'
            }
          }
        },

        Success: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },

        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },

        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 50 },
            totalPages: { type: 'integer', example: 5 }
          }
        },

        Appointment: {
          type: 'object',
          required: ['id', 'clientId', 'lawyerId', 'dateTime', 'type', 'status', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440004'
            },
            clientId: {
              type: 'string',
              format: 'uuid',
              description: 'Client user ID',
              example: '550e8400-e29b-41d4-a716-446655440002'
            },
            lawyerId: {
              type: 'string',
              format: 'uuid',
              description: 'Lawyer user ID',
              example: '550e8400-e29b-41d4-a716-446655440003'
            },
            caseId: {
              type: 'string',
              nullable: true,
              format: 'uuid',
              description: 'Related case ID',
              example: '550e8400-e29b-41d4-a716-446655440001'
            },
            dateTime: {
              type: 'string',
              format: 'date-time',
              description: 'Appointment date and time',
              example: '2024-01-15T10:00:00.000Z'
            },
            type: {
              type: 'string',
              enum: ['consultation', 'follow_up', 'case_review', 'document_review'],
              description: 'Appointment type',
              example: 'consultation'
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
              default: 'scheduled',
              description: 'Appointment status',
              example: 'scheduled'
            },
            notes: {
              type: 'string',
              nullable: true,
              maxLength: 1000,
              description: 'Additional notes',
              example: 'Initial consultation for property dispute'
            },
            location: {
              type: 'string',
              nullable: true,
              description: 'Meeting location',
              example: 'Kigali Legal Center - Office 201'
            },
            duration: {
              type: 'integer',
              default: 30,
              description: 'Duration in minutes',
              example: 30
            },
            fee: {
              type: 'number',
              nullable: true,
              minimum: 0,
              description: 'Consultation fee in RWF',
              example: 15000
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T09:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User profile and account management'
      },
      {
        name: 'Lawyers',
        description: 'Lawyer profiles and directory services'
      },
      {
        name: 'Cases',
        description: 'Legal case management and tracking'
      },
      {
        name: 'Appointments',
        description: 'Appointment scheduling and management'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export default specs;
