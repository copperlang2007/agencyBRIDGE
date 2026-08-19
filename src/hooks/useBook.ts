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
    // Do not keep serving rows a failed request could not confirm the caller is
    // still entitled to.
    gcTime: 60_000,
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

/**
 * Returns the rows, and nothing at all when the request failed.
 *
 * A failed fetch must not read as "this book is empty". Those are different
 * facts and they look identical on screen — an agent whose session was revoked
 * would see a clean, plausible "no clients" rather than being told to sign in.
 * Cached rows are dropped on an authentication or authorization failure for the
 * same reason: a revoked session must stop rendering the rows it used to be
 * allowed to see.
 */
function rowsOf<T>(query: UseQueryResult<T[]>): T[] {
  if (query.isError) return EMPTY;
  return query.data ?? EMPTY;
}

export const useClients = (): ClientRecord[] => rowsOf(useClientsQuery());
export const usePolicies = (): PolicyRecord[] => rowsOf(usePoliciesQuery());
export const useAppointments = (): AppointmentRecord[] => rowsOf(useAppointmentsQuery());
export const useAgents = (): AgentRecord[] => rowsOf(useAgentsQuery());

/**
 * The error behind an empty book, if there is one. Pages use it to say "could
 * not load" instead of "nothing here".
 */
export function useBookError(): string | null {
  const queries = [useClientsQuery(), usePoliciesQuery(), useAppointmentsQuery(), useAgentsQuery()];
  const failed = queries.find((q) => q.isError);
  if (!failed) return null;
  const err = failed.error as { message?: string } | undefined;
  return err?.message ?? "Could not load your book of business.";
}

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
