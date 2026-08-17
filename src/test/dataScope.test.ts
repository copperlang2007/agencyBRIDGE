import { describe, it, expect, beforeEach } from "vitest";
import {
  scopedClients,
  scopedPolicies,
  scopedAppointments,
  scopedAgents,
  isDataScoped,
  getAgentName,
} from "@/lib/dataScope";
import { clients, policies, appointments, agents } from "@/lib/mockData";
import type { UserInfo } from "@/lib/roleContext";

// ── Test fixtures ────────────────────────────────────────────────────
// We use real agent names from the mock data so the scoping functions
// can match the `agent` field on clients/policies/appointments.

const adminUser: UserInfo = {
  id: "u1",
  name: "Patricia Chen",
  email: "patricia@agencybridge.com",
  role: "admin",
};

const supervisorUser: UserInfo = {
  id: "u3",
  name: "Ryan Mitchell",
  email: "ryan@agencybridge.com",
  role: "supervisor",
};

// Use a real agent from mockData so the name matches assigned records
const agentUser: UserInfo = {
  id: "AG-001",
  name: "Daniel Reyes",
  email: "daniel.reyes@agencybridge.com",
  role: "agent",
};

// Another real agent — used to verify cross-agent isolation
const otherAgentUser: UserInfo = {
  id: "AG-002",
  name: "Sophia Martinez",
  email: "sophia.martinez@agencybridge.com",
  role: "agent",
};

const retentionUser: UserInfo = {
  id: "u7",
  name: "Diane Foster",
  email: "diane@agencybridge.com",
  role: "retention",
};

const readonlyUser: UserInfo = {
  id: "u8",
  name: "External Auditor",
  email: "auditor@firm.com",
  role: "readonly",
};

const nullUser = null;

// ── scopedClients ────────────────────────────────────────────────────
describe("scopedClients", () => {
  it("returns all clients for admin role", () => {
    const result = scopedClients(adminUser);
    expect(result).toHaveLength(clients.length);
  });

  it("returns all clients for supervisor role", () => {
    const result = scopedClients(supervisorUser);
    expect(result).toHaveLength(clients.length);
  });

  it("returns all clients for retention role", () => {
    const result = scopedClients(retentionUser);
    expect(result).toHaveLength(clients.length);
  });

  it("returns all clients for readonly role", () => {
    const result = scopedClients(readonlyUser);
    expect(result).toHaveLength(clients.length);
  });

  it("returns only the agent's own clients for agent role", () => {
    const result = scopedClients(agentUser);
    // Every returned client must be assigned to Daniel Reyes
    result.forEach((c) => {
      expect(c.agent).toBe("Daniel Reyes");
    });
    // Must not return clients assigned to other agents
    result.forEach((c) => {
      expect(c.agent).not.toBe("Sophia Martinez");
      expect(c.agent).not.toBe("Marcus Johnson");
    });
  });

  it("does not include any clients from another agent's book", () => {
    const danielClients = scopedClients(agentUser);
    const sophiaClients = scopedClients(otherAgentUser);

    // The two sets of client IDs must be completely disjoint
    const danielIds = new Set(danielClients.map((c) => c.id));
    const sophiaIds = new Set(sophiaClients.map((c) => c.id));
    sophiaIds.forEach((id) => {
      expect(danielIds.has(id)).toBe(false);
    });
  });

  it("returns an empty array when user is null", () => {
    expect(scopedClients(nullUser)).toEqual([]);
  });
});

// ── scopedPolicies ────────────────────────────────────────────────────
describe("scopedPolicies", () => {
  it("returns all policies for admin role", () => {
    const result = scopedPolicies(adminUser);
    expect(result).toHaveLength(policies.length);
  });

  it("returns all policies for supervisor role", () => {
    const result = scopedPolicies(supervisorUser);
    expect(result).toHaveLength(policies.length);
  });

  it("returns only the agent's own policies for agent role", () => {
    const result = scopedPolicies(agentUser);
    result.forEach((p) => {
      expect(p.agent).toBe("Daniel Reyes");
    });
    result.forEach((p) => {
      expect(p.agent).not.toBe("Sophia Martinez");
    });
  });

  it("does not include policies from another agent", () => {
    const danielPolicies = scopedPolicies(agentUser);
    const sophiaPolicies = scopedPolicies(otherAgentUser);

    const danielIds = new Set(danielPolicies.map((p) => p.id));
    const sophiaIds = new Set(sophiaPolicies.map((p) => p.id));
    sophiaIds.forEach((id) => {
      expect(danielIds.has(id)).toBe(false);
    });
  });

  it("returns an empty array when user is null", () => {
    expect(scopedPolicies(nullUser)).toEqual([]);
  });
});

// ── scopedAppointments ────────────────────────────────────────────────
describe("scopedAppointments", () => {
  it("returns all appointments for admin role", () => {
    const result = scopedAppointments(adminUser);
    expect(result).toHaveLength(appointments.length);
  });

  it("returns all appointments for supervisor role", () => {
    const result = scopedAppointments(supervisorUser);
    expect(result).toHaveLength(appointments.length);
  });

  it("returns only the agent's own appointments for agent role", () => {
    const result = scopedAppointments(agentUser);
    result.forEach((a) => {
      expect(a.agent).toBe("Daniel Reyes");
    });
    result.forEach((a) => {
      expect(a.agent).not.toBe("Sophia Martinez");
      expect(a.agent).not.toBe("Marcus Johnson");
    });
  });

  it("does not include appointments from another agent", () => {
    const danielAppts = scopedAppointments(agentUser);
    const sophiaAppts = scopedAppointments(otherAgentUser);

    const danielIds = new Set(danielAppts.map((a) => a.id));
    const sophiaIds = new Set(sophiaAppts.map((a) => a.id));
    sophiaIds.forEach((id) => {
      expect(danielIds.has(id)).toBe(false);
    });
  });

  it("returns an empty array when user is null", () => {
    expect(scopedAppointments(nullUser)).toEqual([]);
  });
});

// ── scopedAgents ──────────────────────────────────────────────────────
describe("scopedAgents", () => {
  it("returns all agents for admin role", () => {
    const result = scopedAgents(adminUser);
    expect(result).toHaveLength(agents.length);
  });

  it("returns all agents for supervisor role", () => {
    const result = scopedAgents(supervisorUser);
    expect(result).toHaveLength(agents.length);
  });

  it("returns only agent-role records for retention role", () => {
    const result = scopedAgents(retentionUser);
    // Retention sees all agents with role "Agent" (not admin/retention agents)
    result.forEach((a) => {
      expect(a.role).toBe("Agent");
    });
    expect(result.length).toBe(agents.filter((a) => a.role === "Agent").length);
  });

  it("returns only themselves for agent role", () => {
    const result = scopedAgents(agentUser);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Daniel Reyes");
  });

  it("agent cannot see other agents in the agents list", () => {
    const result = scopedAgents(agentUser);
    const otherNames = result.map((a) => a.name);
    expect(otherNames).not.toContain("Sophia Martinez");
    expect(otherNames).not.toContain("Marcus Johnson");
    expect(otherNames).not.toContain("Elena Vasquez");
  });

  it("returns only themselves for readonly role", () => {
    const result = scopedAgents(readonlyUser);
    // Readonly is not in the agents list, so should return empty
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when user is null", () => {
    expect(scopedAgents(nullUser)).toEqual([]);
  });
});

// ── isDataScoped ───────────────────────────────────────────────────────
describe("isDataScoped", () => {
  it("returns true for agent role", () => {
    expect(isDataScoped("agent")).toBe(true);
  });

  it("returns false for admin role", () => {
    expect(isDataScoped("admin")).toBe(false);
  });

  it("returns false for supervisor role", () => {
    expect(isDataScoped("supervisor")).toBe(false);
  });

  it("returns false for retention role", () => {
    expect(isDataScoped("retention")).toBe(false);
  });

  it("returns false for readonly role", () => {
    expect(isDataScoped("readonly")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDataScoped(null)).toBe(false);
  });
});

// ── getAgentName ───────────────────────────────────────────────────────
describe("getAgentName", () => {
  it("returns the user's name for agent role", () => {
    expect(getAgentName(agentUser)).toBe("Daniel Reyes");
  });

  it("returns null for admin role", () => {
    expect(getAgentName(adminUser)).toBeNull();
  });

  it("returns null for supervisor role", () => {
    expect(getAgentName(supervisorUser)).toBeNull();
  });

  it("returns null for retention role", () => {
    expect(getAgentName(retentionUser)).toBeNull();
  });

  it("returns null for null user", () => {
    expect(getAgentName(nullUser)).toBeNull();
  });
});

// ── Cross-cutting isolation test ───────────────────────────────────────
describe("agent data isolation (cross-cutting)", () => {
  it("an agent never sees another agent's clients, policies, or appointments", () => {
    const danielClients = scopedClients(agentUser);
    const danielPolicies = scopedPolicies(agentUser);
    const danielAppts = scopedAppointments(agentUser);

    // Collect all agent names that appear in Daniel's scoped data
    const agentNamesInClients = new Set(danielClients.map((c) => c.agent));
    const agentNamesInPolicies = new Set(danielPolicies.map((p) => p.agent));
    const agentNamesInAppts = new Set(danielAppts.map((a) => a.agent));

    // Only "Daniel Reyes" should appear
    expect(agentNamesInClients.size).toBeLessThanOrEqual(1);
    agentNamesInClients.forEach((name) => expect(name).toBe("Daniel Reyes"));

    expect(agentNamesInPolicies.size).toBeLessThanOrEqual(1);
    agentNamesInPolicies.forEach((name) => expect(name).toBe("Daniel Reyes"));

    expect(agentNamesInAppts.size).toBeLessThanOrEqual(1);
    agentNamesInAppts.forEach((name) => expect(name).toBe("Daniel Reyes"));
  });

  it("two different agents have completely disjoint datasets", () => {
    const daniel = {
      clients: new Set(scopedClients(agentUser).map((c) => c.id)),
      policies: new Set(scopedPolicies(agentUser).map((p) => p.id)),
      appts: new Set(scopedAppointments(agentUser).map((a) => a.id)),
    };
    const sophia = {
      clients: new Set(scopedClients(otherAgentUser).map((c) => c.id)),
      policies: new Set(scopedPolicies(otherAgentUser).map((p) => p.id)),
      appts: new Set(scopedAppointments(otherAgentUser).map((a) => a.id)),
    };

    // No overlap in any dataset
    sophia.clients.forEach((id) => expect(daniel.clients.has(id)).toBe(false));
    sophia.policies.forEach((id) => expect(daniel.policies.has(id)).toBe(false));
    sophia.appts.forEach((id) => expect(daniel.appts.has(id)).toBe(false));
  });
});
