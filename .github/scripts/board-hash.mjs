// Vingerafdruk van het scrumboard: verandert bij elke aanpassing op het board
// (kaart verplaatst, veld aangepast, issue bewerkt/gesloten, branch gepusht).
// Licht genoeg om elke minuut te draaien. Schrijft de hash naar stdout.
import { createHash } from "node:crypto";

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const ownerType = process.env.GITHUB_OWNER_TYPE === "organization" ? "organization" : "user";
const number = Number(process.env.GITHUB_PROJECT_NUMBER);
if (!token || !owner || !number) {
  console.error("GITHUB_TOKEN, GITHUB_OWNER en GITHUB_PROJECT_NUMBER zijn nodig.");
  process.exit(1);
}

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

const parts = [];
const repos = new Set();
let cursor = null;
do {
  const data = await gql(
    `query($owner: String!, $number: Int!, $cursor: String) {
      owner: ${ownerType}(login: $owner) {
        projectV2(number: $number) {
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id updatedAt
              content { ... on Issue { updatedAt state repository { nameWithOwner } } }
            }
          }
        }
      }
    }`,
    { owner, number, cursor },
  );
  const items = data.owner.projectV2.items;
  for (const n of items.nodes) {
    parts.push(`${n.id}|${n.updatedAt}|${n.content?.updatedAt ?? ""}|${n.content?.state ?? ""}`);
    if (n.content?.repository) repos.add(n.content.repository.nameWithOwner);
  }
  cursor = items.pageInfo.hasNextPage ? items.pageInfo.endCursor : null;
} while (cursor);

// Branches (de site toont ze ook): naam + laatste commit.
for (const full of [...repos].sort()) {
  const [o, name] = full.split("/");
  let after = null;
  do {
    const data = await gql(
      `query($o: String!, $name: String!, $after: String) {
        repository(owner: $o, name: $name) {
          refs(refPrefix: "refs/heads/", first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { name target { oid } }
          }
        }
      }`,
      { o, name, after },
    );
    const refs = data.repository.refs;
    for (const r of refs.nodes) parts.push(`${full}:${r.name}@${r.target?.oid ?? ""}`);
    after = refs.pageInfo.hasNextPage ? refs.pageInfo.endCursor : null;
  } while (after);
}

parts.sort();
console.log(createHash("sha256").update(parts.join("\n")).digest("hex"));
