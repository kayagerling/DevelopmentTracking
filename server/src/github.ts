import { config } from "./config.js";

/** Ruwe PRD zoals hij uit het GitHub Project (scrumboard) komt. */
export interface RawPrd {
  id: string;
  prdNumber: string;
  title: string;
  url: string;
  repository: string;
  status: string;
  theme: string;
  closed: boolean;
  body: string;
  updatedAt: string;
  assignees: { login: string; name: string | null; avatarUrl: string }[];
}

const FIELD_FRAGMENT = `field { ... on ProjectV2FieldCommon { name } }`;

function buildQuery(ownerType: "user" | "organization"): string {
  return `
query($owner: String!, $number: Int!, $cursor: String) {
  owner: ${ownerType}(login: $owner) {
    projectV2(number: $number) {
      title
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValues(first: 30) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldSingleSelectValue { name ${FIELD_FRAGMENT} }
              ... on ProjectV2ItemFieldTextValue { text ${FIELD_FRAGMENT} }
              ... on ProjectV2ItemFieldIterationValue { title ${FIELD_FRAGMENT} }
            }
          }
          content {
            __typename
            ... on Issue {
              number title body url state updatedAt
              repository { nameWithOwner }
              assignees(first: 10) { nodes { login name avatarUrl } }
              labels(first: 20) { nodes { name } }
            }
          }
        }
      }
    }
  }
}`;
}

interface FieldValueNode {
  __typename: string;
  name?: string;
  text?: string;
  title?: string;
  field?: { name?: string };
}

interface ItemNode {
  id: string;
  fieldValues: { nodes: FieldValueNode[] };
  content: {
    __typename: string;
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    state?: string;
    updatedAt?: string;
    repository?: { nameWithOwner: string };
    assignees?: { nodes: { login: string; name: string | null; avatarUrl: string }[] };
    labels?: { nodes: { name: string }[] };
  } | null;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.github.token}`,
      "Content-Type": "application/json",
      "User-Agent": "DevelopmentTracker",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[]; message?: string };
  if (!res.ok || json.errors) {
    const msg = json.errors?.map((e) => e.message).join("; ") ?? json.message ?? res.statusText;
    throw new Error(`GitHub API: ${msg}`);
  }
  return json.data as T;
}

function fieldValue(item: ItemNode, fieldName: string): string {
  const wanted = fieldName.toLowerCase();
  for (const v of item.fieldValues.nodes) {
    if (v.field?.name?.toLowerCase() === wanted) return (v.name ?? v.text ?? v.title ?? "").trim();
  }
  return "";
}

export async function fetchPrds(): Promise<{ projectTitle: string; prds: RawPrd[] }> {
  const { owner, ownerType, projectNumber, statusField, themeField, themeLabelPrefix, prdTitlePattern } =
    config.github;
  const query = buildQuery(ownerType);
  const prds: RawPrd[] = [];
  let projectTitle = "";
  let cursor: string | null = null;

  do {
    type Resp = {
      owner: {
        projectV2: {
          title: string;
          items: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: ItemNode[] };
        } | null;
      } | null;
    };
    const data: Resp = await graphql<Resp>(query, { owner, number: projectNumber, cursor });
    const project = data.owner?.projectV2;
    if (!project) throw new Error(`Project #${projectNumber} van ${owner} niet gevonden (check GITHUB_OWNER_TYPE en token-rechten 'read:project').`);
    projectTitle = project.title;

    for (const item of project.items.nodes) {
      const c = item.content;
      if (!c || c.__typename !== "Issue" || !c.title) continue;
      const match = c.title.match(prdTitlePattern);
      if (!match) continue; // geen PRD

      const labels = c.labels?.nodes.map((l) => l.name) ?? [];
      const themeFromLabel = labels
        .find((l) => l.toLowerCase().startsWith(themeLabelPrefix.toLowerCase()))
        ?.slice(themeLabelPrefix.length)
        .trim();

      prds.push({
        id: item.id,
        prdNumber: `PRD-${match[1]}`,
        title: (match[2] || c.title).trim(),
        url: c.url ?? "",
        repository: c.repository?.nameWithOwner ?? "",
        status: fieldValue(item, statusField) || (c.state === "CLOSED" ? "Done" : "Todo"),
        theme: fieldValue(item, themeField) || themeFromLabel || "Geen thema",
        closed: c.state === "CLOSED",
        body: c.body ?? "",
        updatedAt: c.updatedAt ?? "",
        assignees: c.assignees?.nodes ?? [],
      });
    }
    cursor = project.items.pageInfo.hasNextPage ? project.items.pageInfo.endCursor : null;
  } while (cursor);

  return { projectTitle, prds };
}
