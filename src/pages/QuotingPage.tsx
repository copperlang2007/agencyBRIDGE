import { useState, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Star, Pill, Stethoscope, TrendingUp, MapPin, DollarSign,
  CheckCircle2, XCircle, AlertCircle, Download,
} from "lucide-react";
import { mockQuotePlans, mockFormulary, mockProviders, type QuotePlan, type DrugFormularyEntry, type ProviderEntry } from "@/lib/workflowData";
import { cn } from "@/lib/utils";
import { TPMO_DISCLAIMER } from "@/lib/complianceData";

export default function QuotingPage() {
  const { user } = useRole();
  const [tab, setTab] = useState("plans");
  const [zip, setZip] = useState("33101");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_quoting", category: "system", entity: "Quoting Engine", severity: "info" });
  }, [user]);

  const sortedPlans = useMemo(() => [...mockQuotePlans].sort((a, b) => b.score - a.score), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Quoting Engine" description="Compare MA, MAPD, Medigap, and Part D plans by ZIP code with formulary and provider network lookup" />

      {/* TPMO Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-amber-900 leading-relaxed">{TPMO_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {/* ZIP Input */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Enter ZIP code" className="w-32" />
        </div>
        <Badge variant="outline" className="text-xs">{sortedPlans.length} plans available</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plans">Plan Comparison</TabsTrigger>
          <TabsTrigger value="formulary">Formulary Lookup</TabsTrigger>
          <TabsTrigger value="providers">Provider Network</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlanComparison plans={sortedPlans} selectedPlan={selectedPlan} onSelect={setSelectedPlan} />
        </TabsContent>
        <TabsContent value="formulary">
          <FormularyTab />
        </TabsContent>
        <TabsContent value="providers">
          <ProviderTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanComparison({ plans, selectedPlan, onSelect }: { plans: QuotePlan[]; selectedPlan: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan, idx) => (
          <PlanCard key={plan.id} plan={plan} rank={idx + 1} selected={selectedPlan === plan.id} onSelect={() => onSelect(plan.id)} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, rank, selected, onSelect }: { plan: QuotePlan; rank: number; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={cn("cursor-pointer transition-all", selected ? "border-accent ring-2 ring-accent/20" : "hover:border-accent/50")} >
      <CardContent className="pt-4 pb-4" onClick={onSelect}>
        <div className="flex items-center justify-between mb-2">
          <Badge variant={rank === 1 ? "default" : "secondary"} className="text-xs">#{rank} Best Match</Badge>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{plan.starRating}</span>
          </div>
        </div>
        <div className="text-sm font-bold mb-0.5">{plan.carrier}</div>
        <div className="text-xs text-muted-foreground mb-3">{plan.planName}</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="text-[10px] text-muted-foreground">Monthly Premium</div>
            <div className="text-sm font-semibold">{plan.premiumMonthly === 0 ? "$0" : `$${plan.premiumMonthly}`}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">MOOP (In-Network)</div>
            <div className="text-sm font-semibold">${plan.moopInNetwork.toLocaleString()}</div>
          </div>
        </div>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Pill className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Formulary match:</span>
            <span className="font-medium text-green-600">{plan.formularyMatch}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Stethoscope className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Doctor match:</span>
            <span className="font-medium text-green-600">{plan.doctorMatch}%</span>
          </div>
        </div>
        {plan.extraBenefits.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {plan.extraBenefits.slice(0, 4).map(b => <Badge key={b} variant="outline" className="text-[9px] font-normal">{b}</Badge>)}
            {plan.extraBenefits.length > 4 && <Badge variant="outline" className="text-[9px] font-normal">+{plan.extraBenefits.length - 4} more</Badge>}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold">Score: {plan.score}/100</span>
          </div>
          <Badge variant="outline" className="text-[10px]">{plan.networkType}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function FormularyTab() {
  const [search, setSearch] = useState("");
  const drugs = mockFormulary["QP001"] || [];
  const filtered = drugs.filter(d => d.drugName.toLowerCase().includes(search.toLowerCase()) || d.genericName.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulary / Drug Lookup</CardTitle>
        <CardDescription>Search medications across plan formularies — tier, prior auth, step therapy, and copay estimates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drug name (e.g. Metformin, Eliquis)..." className="max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Drug</th>
                <th className="pb-2 font-medium">Class</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Covered</th>
                <th className="pb-2 font-medium">Prior Auth</th>
                <th className="pb-2 font-medium">Step Therapy</th>
                <th className="pb-2 font-medium">Qty Limit</th>
                <th className="pb-2 font-medium">30-day Copay</th>
                <th className="pb-2 font-medium">90-day Copay</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => <FormularyRow key={d.drugName} drug={d} />)}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function FormularyRow({ drug }: { drug: DrugFormularyEntry }) {
  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="py-2">
        <div className="font-medium">{drug.drugName}</div>
        <div className="text-[10px] text-muted-foreground">{drug.genericName}</div>
      </td>
      <td className="py-2 text-xs text-muted-foreground">{drug.drugClass}</td>
      <td className="py-2"><Badge variant="outline" className="text-xs">Tier {drug.tier}</Badge></td>
      <td className="py-2">{drug.covered ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}</td>
      <td className="py-2">{drug.priorAuth ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}</td>
      <td className="py-2">{drug.stepTherapy ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}</td>
      <td className="py-2 text-xs">{drug.quantityLimit}</td>
      <td className="py-2 font-medium">{drug.copay30day === 0 ? "$0" : `$${drug.copay30day}`}</td>
      <td className="py-2 font-medium">{drug.copay90day === 0 ? "$0" : `$${drug.copay90day}`}</td>
    </tr>
  );
}

function ProviderTab() {
  const [search, setSearch] = useState("");
  const filtered = mockProviders.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.specialty.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Network Lookup</CardTitle>
        <CardDescription>Search doctors and check which plans include them in-network — critical for the "keep my doctors" decision</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor name or specialty..." className="max-w-md" />
        </div>
        <div className="space-y-3">
          {filtered.map((p) => <ProviderRow key={p.npi} provider={p} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ provider }: { provider: ProviderEntry }) {
  const plans = Object.entries(provider.inNetwork);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium">{provider.name}</div>
          <div className="text-xs text-muted-foreground">{provider.specialty} · {provider.practice}</div>
          <div className="text-xs text-muted-foreground">{provider.address} · {provider.phone}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{provider.distance} mi away</div>
          {provider.acceptingNew ? (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200">Accepting new</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-red-600 border-red-200">Not accepting</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        {plans.map(([planId, inNet]) => {
          const plan = mockQuotePlans.find(p => p.id === planId);
          return (
            <Badge key={planId} variant="outline" className={cn("text-[10px]", inNet ? "text-green-600 border-green-200" : "text-red-600 border-red-200")}>
              {plan ? plan.carrier : planId}: {inNet ? "In-Network" : "Out"}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
