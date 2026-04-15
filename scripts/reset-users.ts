import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetUsersPasswords() {
    try {
        console.log('🔄 Starting user password reset...\n');

        const usersToReset = ['adnan', 'jatin', 'hussain', 'mustafa', 'shahid'];
        for (const username of usersToReset) {
            // Check if user exists
            const user = await prisma.user.findFirst({
                where: { username: username }
            });

            if (!user) {
                console.log(`⚠️ User not found: ${username}`);
                continue;
            }

            // Hash the password (using username as password)
            const hashedPassword = await bcrypt.hash(username, 10);

            // Update user password
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            console.log(`✅ Password reset successfully for user: ${username}`);
        }
        console.log('\n🎉 Password reset process completed!\n');

    } catch (error) {
        console.error('❌ Error resetting user passwords:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
resetUsersPasswords()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
