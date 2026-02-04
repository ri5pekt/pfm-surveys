import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { db } from '../db/connection';
import crypto from 'crypto';

const InviteUserSchema = z.object({
  email: z.string().email(),
});

const teamRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all team members in the user's tenant
  fastify.get('/api/team', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string; tenant_id: string };

    const members = await db
      .selectFrom('users')
      .selectAll()
      .where('tenant_id', '=', user.tenant_id)
      .where('active', '=', true)
      .orderBy('created_at', 'asc')
      .execute();

    return members;
  });

  // Invite a new team member
  fastify.post('/api/team/invite', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string; tenant_id: string; email: string };
    const data = InviteUserSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', data.email)
      .executeTakeFirst();

    if (existingUser) {
      return reply.code(400).send({ error: 'User with this email already exists' });
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Create the new user in the same tenant
    const newUser = await AuthService.createUser({
      tenant_id: user.tenant_id,
      email: data.email,
      password: tempPassword,
    });

    // Send invitation email
    let emailSent = false;
    let emailError = null;
    
    try {
      await EmailService.sendInvitationEmail({
        to: data.email,
        tempPassword,
        invitedBy: user.email,
      });
      emailSent = true;
    } catch (error: any) {
      fastify.log.error('Failed to send invitation email:', error);
      emailError = error.message;
    }

    // If email failed, still return the password so admin can share it manually
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      emailSent,
      tempPassword: emailSent ? undefined : tempPassword, // Only return password if email failed
      message: emailSent 
        ? 'Invitation email sent successfully!' 
        : `User created but email failed to send. Please share this password manually: ${tempPassword}`,
      error: emailError,
    };
  });

  // Resend invitation to a team member
  fastify.post('/api/team/:userId/resend-invite', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string; tenant_id: string; email: string };
    const { userId } = request.params as { userId: string };

    // Verify the user belongs to the same tenant
    const targetUser = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .where('tenant_id', '=', user.tenant_id)
      .executeTakeFirst();

    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Generate a new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Update the user's password
    await AuthService.updatePassword(targetUser.id, tempPassword);

    // Send invitation email
    let emailSent = false;
    let emailError = null;
    
    try {
      await EmailService.sendInvitationEmail({
        to: targetUser.email,
        tempPassword,
        invitedBy: user.email,
      });
      emailSent = true;
    } catch (error: any) {
      fastify.log.error('Failed to send invitation email:', error);
      emailError = error.message;
    }

    return {
      user: {
        id: targetUser.id,
        email: targetUser.email,
      },
      emailSent,
      tempPassword: emailSent ? undefined : tempPassword,
      message: emailSent 
        ? 'Invitation resent successfully!' 
        : `Password reset but email failed to send. Please share this password manually: ${tempPassword}`,
      error: emailError,
    };
  });

  // Remove a team member
  fastify.delete('/api/team/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: string; tenant_id: string };
    const { userId } = request.params as { userId: string };

    // Prevent users from removing themselves
    if (userId === user.id) {
      return reply.code(400).send({ error: 'You cannot remove yourself' });
    }

    // Verify the user belongs to the same tenant
    const targetUser = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .where('tenant_id', '=', user.tenant_id)
      .executeTakeFirst();

    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Soft delete by setting active to false
    await db
      .updateTable('users')
      .set({ active: false, updated_at: new Date() })
      .where('id', '=', userId)
      .execute();

    return { message: 'User removed successfully' };
  });
};

export default teamRoutes;
