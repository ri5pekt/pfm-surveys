import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { db } from '../db/connection';

const UpdateProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const ChangePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(6),
});

const userRoutes: FastifyPluginAsync = async (fastify) => {
  // Get current user profile
  fastify.get('/api/user/profile', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string };

    const userProfile = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirst();

    if (!userProfile) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = userProfile;
    return userWithoutPassword;
  });

  // Update user profile
  fastify.put('/api/user/profile', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const data = UpdateProfileSchema.parse(request.body);

    const updatedUser = await db
      .updateTable('users')
      .set({
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        updated_at: new Date(),
      })
      .where('id', '=', user.id)
      .returningAll()
      .executeTakeFirst();

    if (!updatedUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  });

  // Change password
  fastify.put('/api/user/password', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string };
    const data = ChangePasswordSchema.parse(request.body);

    // Get current user with password
    const currentUser = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirst();

    if (!currentUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthService.comparePassword(
      data.current_password,
      currentUser.password_hash
    );

    if (!isCurrentPasswordValid) {
      return reply.code(401).send({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(data.new_password);

    // Update password
    await db
      .updateTable('users')
      .set({
        password_hash: newPasswordHash,
        updated_at: new Date(),
      })
      .where('id', '=', user.id)
      .execute();

    return { message: 'Password changed successfully' };
  });
};

export default userRoutes;
