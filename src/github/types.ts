/** Subconjunto já achatado do payload GraphQL do GitHub que o BugDex consome. */
export interface RawProfile {
  login: string;
  avatarUrl: string;
  repositories: RawRepo[];
}

export interface RawRepo {
  /** node_id do GitHub — estável entre visitas. */
  id: string;
  name: string;
  isFork: boolean;
  stargazerCount: number;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601; null em repositório vazio. */
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
  /** Já achatado de languages.edges. */
  languages: { size: number; name: string }[];
  /** history.totalCount do branch default; null se o repo não tem branch. */
  defaultBranchRef: { totalCommits: number } | null;
}
