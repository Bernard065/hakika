import swaggerAutogen from 'swagger-autogen';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doc = {
  info: {
    title: 'Hakika Auth Service API',
    description: 'Authentication and Authorization API with OTP-based email verification',
    version: '1.0.0',
  },
  host: 'localhost:6001',
  basePath: '/',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and registration endpoints',
    },
    {
      name: 'OTP',
      description: 'One-Time Password verification operations',
    },
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      in: 'header',
      bearerFormat: 'JWT',
      description: 'JWT Authorization header using Bearer scheme',
    },
  },
  definitions: {
    RegisterUser: {
      name: 'John Doe',
      email: 'user@example.com',
      password: 'SecurePass123!',
      userType: 'user',
    },
    RegisterSeller: {
      name: 'Jane Seller',
      email: 'seller@example.com',
      password: 'SellerPass123!',
      userType: 'seller',
      phoneNumber: '+254712345678',
      country: 'Kenya',
    },
    VerifyOtp: {
      email: 'user@example.com',
      otp: '123456',
    },
    Login: {
      email: 'user@example.com',
      password: 'SecurePass123!',
    },
    ResendOtp: {
      email: 'user@example.com',
    },
    SuccessResponse: {
      message: 'Operation successful',
    },
    ErrorResponse: {
      status: 'error',
      message: 'An error occurred',
    },
    User: {
      id: 'clx1234567890',
      email: 'user@example.com',
      name: 'John Doe',
      userType: 'user',
      isVerified: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  },
};

// Output file path - will be generated in the config folder
const outputFile = path.join(__dirname, './swagger-output.json');

// Endpoint files to scan - point to main.ts which imports the library routes
const endpointsFiles = [
  path.join(__dirname, '../main.ts'),
  // Also scan the library routes directly
  path.join(__dirname, '../../../../libs/auth/api/src/lib/routes/auth.routes.ts'),
];

// Generate swagger documentation
swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc).then(() => {
  console.log('✅ Swagger documentation generated successfully!');
  console.log(`📄 Output: ${outputFile}`);
}).catch((err) => {
  console.error('❌ Error generating swagger documentation:', err);
  process.exit(1);
});