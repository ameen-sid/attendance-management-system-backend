import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminUser() {
    try {
        console.log('🔄 Starting admin user reset...\n');

        // Step 1: Delete all existing admin users
        const deleteResult = await prisma.user.deleteMany({
            where: {
                isAdmin: true
            }
        });
        console.log(`✅ Deleted ${deleteResult.count} existing admin user(s)\n`);

        // Step 2: Hash the password
        const password = 'admin';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Step 3: Create new admin user
        const newAdmin = await prisma.user.create({
            data: {
                fullname: 'Administrator',
                username: 'admin',
                email: 'admin@company.com',
                password: hashedPassword,
                isAdmin: true,
                role: 'Admin',
                shift_hours: 9.0
            }
        });

        console.log('✅ New admin user created successfully!\n');
        console.log('📋 Admin User Details:');
        console.log('   Username: admin');
        console.log('   Password: admin');
        console.log('   Full Name:', newAdmin.fullname);
        console.log('   Email:', newAdmin.email);
        console.log('   User ID:', newAdmin.id);
        console.log('\n🎉 You can now login to the web dashboard with these credentials!\n');

    } catch (error) {
        console.error('❌ Error resetting admin user:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
resetAdminUser()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
