/**
 * Data scoping layer — filters mock data by the current user's role and assignment.
 *
 * - Admin: sees everything (all clients, policies, appointments, agents)
 * - Supervisor: sees all agents' data (operational oversight)
 * - Agent: sees ONLY their own assigned clients, policies, appointments
 * - Retention: sees all at-risk/retention data (book-level access)
 * - Readonly: sees everything (auditor read-only access)
 */

import { clients, policies, appointments, agents, type Client, type Policy, type Appointment, type Agent } from "@/lib/mockData";
import type { RoleId, UserInfo } from "@/lib/roleContext";

/** Returns the mock Agent record matching the logged-in user's name, if any. */
function getAgentForUser(user: UserInfo): Agent | undefined {
  return agents.find(a => a.name === user.name);
}

/** Scope clients by role. Agents see only their own. */
export function scopedClients(user: UserInfo | null): Client[] {
  if (!user) return [];
  // Admin, supervisor, retention, readonly see all
  if (user.role === "admin" || user.role === "supervisor" || user.role === "retention" || user.role === "readonly") {
    return clients;
  }
  // Agent sees only their assigned clients
  return clients.filter(c => c.agent === user.name);
}

/** Scope policies by role. Agents see only their own. */
export function scopedPolicies(user: UserInfo | null): Policy[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "supervisor" || user.role === "retention" || user.role === "readonly") {
    return policies;
  }
  return policies.filter(p => p.agent === user.name);
}

/** Scope appointments by role. Agents see only their own. */
export function scopedAppointments(user: UserInfo | null): Appointment[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "supervisor" || user.role === "retention" || user.role === "readonly") {
    return appointments;
  }
  return appointments.filter(a => a.agent === user.name);
}

/** Scope agents list by role. Agents see only themselves. */
export function scopedAgents(user: UserInfo | null): Agent[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "supervisor") {
    return agents;
  }
  // Agents, retention, readonly see only themselves (or agent-role agents if retention)
  if (user.role === "retention") {
    return agents.filter(a => a.role === "Agent");
  }
  return agents.filter(a => a.name === user.name);
}

/** Returns the agent name string for the current user (for data filtering). */
export function getAgentName(user: UserInfo | null): string | null {
  if (!user) return null;
  if (user.role === "agent") return user.name;
  return null;
}

/** Check if the current user should see scoped (filtered) data. */
export function isDataScoped(role: RoleId | null): boolean {
  return role === "agent";
}
