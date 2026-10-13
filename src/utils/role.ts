export function isGuestUser(user: any): boolean {
  if (!user) return false;
  const name = String(user.role_name ?? user.role ?? '').toLowerCase();
  if (name === 'guest') return true;
  return Number(user.role_id) === 4;
}