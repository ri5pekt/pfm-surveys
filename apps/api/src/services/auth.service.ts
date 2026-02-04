import { db } from '../db/connection';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async findUserByEmail(email: string) {
    return db
      .selectFrom('users')
      .leftJoin('tenants', 'users.tenant_id', 'tenants.id')
      .selectAll('users')
      .select(['tenants.name as tenant_name'])
      .where('users.email', '=', email)
      .where('users.active', '=', true)
      .executeTakeFirst();
  }

  static async createUser(data: {
    tenant_id: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) {
    const passwordHash = await this.hashPassword(data.password);

    return db
      .insertInto('users')
      .values({
        tenant_id: data.tenant_id,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  static async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await this.hashPassword(newPassword);

    return db
      .updateTable('users')
      .set({ 
        password_hash: passwordHash,
        updated_at: new Date(),
      })
      .where('id', '=', userId)
      .execute();
  }

  static async createTenant(name: string) {
    return db
      .insertInto('tenants')
      .values({
        name,
        active: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  static generateSiteId(): string {
    return 'site_' + crypto.randomBytes(16).toString('hex');
  }

  static generateSiteSecret(): string {
    return 'secret_' + crypto.randomBytes(32).toString('hex');
  }
}
