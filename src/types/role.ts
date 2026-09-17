export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export const availableRoles = [
  { value: Role.ADMIN, label: 'admin' },
  { value: Role.EDITOR, label: 'editor' },
  { value: Role.VIEWER, label: 'viewer' },
];

export interface Member {
  email: string;
  role: Role;
  status: 'pending' | 'joined';
}
