export interface Person {
  login: string;
  name: string;
  avatarUrl: string;
}

export interface Branch {
  name: string;
  url: string;
  repository: string;
  lastCommitAt: string;
  prdId: string | null; // PRD waar deze branch bij hoort (null = geen PRD gevonden)
  prdNumber: string | null;
}

export interface Prd {
  id: string;
  prdNumber: string; // bv. "PRD-144"
  title: string; // titel zonder het "PRD-144 —" voorvoegsel
  url: string;
  repository: string;
  status: string; // kolom op het scrumboard
  progress: number; // 0..100
  theme: string;
  assignees: Person[];
  description: string; // originele (technische) beschrijving
  simpleDescription: string; // versimpelde uitleg
  simpleSource: "ai" | "samenvatting";
  updatedAt: string;
  branches: Branch[];
}

export interface GroupProgress {
  key: string;
  label: string;
  avatarUrl?: string;
  count: number;
  done: number;
  progress: number; // gemiddelde 0..100
}

export interface Dashboard {
  projectTitle: string;
  source: "github" | "demo";
  fetchedAt: string;
  refreshSeconds: number;
  totals: {
    count: number;
    done: number;
    inProgress: number;
    notStarted: number;
    progress: number;
    branches: number;
    branchesWithPrd: number;
  };
  byTheme: GroupProgress[];
  byPerson: GroupProgress[];
  prds: Prd[];
  branches: Branch[];
  error?: string;
}
