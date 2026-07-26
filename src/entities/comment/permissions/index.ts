export function canComment(role: string | null | undefined): boolean {
  return !!role;
}

export function canModerateComments(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canVote(role: string | null | undefined): boolean {
  return canComment(role);
}
