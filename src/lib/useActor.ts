import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import { abilitiesFor } from './abilities';
import type { AdminActor } from '../types/users';

// Bundles the current admin's identity + fine-grained abilities.
export function useActor(): { actor: AdminActor; abilities: ReturnType<typeof abilitiesFor>; role: string } {
  const { user } = useAuth();
  const roleId = user?.role ?? 'portfolio_moderator';
  return {
    actor: { name: user?.name ?? 'Unknown', role: ROLES[roleId].label },
    abilities: abilitiesFor(roleId),
    role: roleId,
  };
}
