// Check if user foreign key constraint is causing the issue
import { PrismaClient } from './prisma/generated/client';

const prisma = new PrismaClient();

async function checkUserConstraint() {
  console.log('=== Checking User Foreign Key Constraint ===\n');
  
  // Check media_uploads constraints
  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'media_uploads' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  
  console.log('Foreign key constraints on media_uploads:');
  console.log(constraints);
  
  // Get users table columns first
  const userCols = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='users' ORDER BY ordinal_position
  `);
  console.log('\nUsers table columns:');
  console.log(userCols);
  
  // Check if we have valid users
  const users = await prisma.$queryRawUnsafe(`SELECT id, email FROM users LIMIT 5`);
  console.log('\nSample users in database:');
  console.log(users);
  
  // Check if tour_media has any constraints
  const tourConstraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'tour_media' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  
  console.log('\nForeign key constraints on tour_media:');
  console.log(tourConstraints);
  
  await prisma.$disconnect();
}

checkUserConstraint().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
