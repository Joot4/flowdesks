export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR';

export const ROLE_HOME_PATH: Record<Role, string> = {
  SUPER_ADMIN: '/director',
  ADMIN: '/admin',
  COLLABORATOR: '/me'
};
