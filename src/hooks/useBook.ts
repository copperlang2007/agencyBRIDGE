/**
 * Book-of-business data, fetched from the server.
 *
 * These replace `src/lib/dataScope.ts`, which filtered arrays that had already
 * been shipped to the browser. What a role could *see* was decided here; what a
 * role could *reach* was not decided anywhere. The scoping now happens in SQL
 * (api/_lib/scope.ts) and these hooks receive only the rows the session is
 * entitled to — an agent's request returns their own book because that is all
 * the query selects, not because the client filtered the rest away.
 *
 * Each hook returns an array so callers keep the shape the old helpers had; the
 * query object is exported alongside for callers that need loading or error
 * state.
 */

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { api, type AgentRecord, type AppointmentRecord, type ClientRecord, type PolicyRecord } from "@/lib/api";
import { useRole } from "@/lib/roleContext";

/**
 * Keys are scoped by user id so switching identity — signing in as somebody
 * else, or an admin viewing as an agent — cannot serve the previous identity's
 * rows out of the cache.
 */
export const bookKeys = {
  clients: (userId: string) => ["book", userId, "clients"] as const,
  policies: (userId: string) => ["book", userId, "policies"] as const,
  appointments: (userId: string) => ["book", userId, "appointments"] as const,
  agents: (userId: string) => ["book", userId, "agents"] as const,
};

function useBookQuery<T>(
  part: "clients" | "policies" | "appointments" | "agents",
  fetcher: () => Promise<T[]>,
): UseQueryResult<T[]> {
  const { user } = useRole();
  const id = user?.id ?? "anonymous";
  return useQuery({
    queryKey: bookKeys[part](id),
    queryFn: fetcher,
    // Nothing is fetched before there is a session; an unauthenticated request
    // would only ever come back 401.
    enabled: !!user,
    staleTime: 30_000,
    // A 401 or 403 will not become a 200 by asking again.
    retry: (count, error) => {
      const status = (error as { status?: number }).status ?? 0;
      if (status === 401 || status === 403) return false;
      return count < 2;
    },
  });
}

export const useClientsQuery = () => useBookQuery<ClientRecord>("clients", api.clients);
export const usePoliciesQuery = () => useBookQuery<PolicyRecord>("policies", api.policies);
export const useAppointmentsQuery = () => useBookQuery<AppointmentRecord>("appointments", api.appointments);
export const useAgentsQuery = () => useBookQuery<AgentRecord>("agents", api.agents);

const EMPTY: never[] = [];

export const useClients = (): ClientRecord[] => useClientsQuery().data ?? EMPTY;
export const usePolicies = (): PolicyRecord[] => usePoliciesQuery().data ?? EMPTY;
export const useAppointments = (): AppointmentRecord[] => useAppointmentsQuery().data ?? EMPTY;
export const useAgents = (): AgentRecord[] => useAgentsQuery().data ?? EMPTY;

/** Invalidates every cached slice of the current user's book after a write. */
export function useInvalidateBook(): () => void {
  const queryClient = useQueryClient();
  const { user } = useRole();
  const id = user?.id ?? "anonymous";
  return () => {
    for (const part of ["clients", "policies", "appointments", "agents"] as const) {
      void queryClient.invalidateQueries({ queryKey: bookKeys[part](id) });
    }
  };
}
