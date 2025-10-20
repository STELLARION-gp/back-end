// __tests__/mocks/prisma.mock.ts
import { PrismaClient, user_role, subscription_plan, subscription_status } from '../../prisma/generated/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock the PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// This will replace the actual PrismaClient import in the code with our mock
jest.mock('../../prisma/generated/client', () => {
  const originalModule = jest.requireActual('../../prisma/generated/client');
  return {
    ...originalModule,
    PrismaClient: jest.fn(() => prismaMock),
  };
});

// Function to reset all mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});

// Create a simple test so Jest doesn't complain about empty test file
describe('Prisma mock setup', () => {
  it('should be defined', () => {
    expect(prismaMock).toBeDefined();
  });
});
