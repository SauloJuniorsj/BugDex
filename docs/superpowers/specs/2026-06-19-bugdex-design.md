# BugDex — Documento de Design

- **Data:** 2026-06-19
- **Status:** Design aprovado (aguardando revisão final do spec)
- **Tipo:** Passion project / vitrine viral para devs
- **Inspiração:** [Git City](https://github.com/srizzon/git-city) (Samuel Rizzon) — "seu perfil do GitHub vira uma cidade 3D". O BugDex pega o mesmo espírito (login social → dados viram algo visual e compartilhável → motor viral entre devs), mas com a metáfora de um **ecossistema vivo de criaturas**.

---

## 1. Resumo (1 frase)

**BugDex** transforma seu perfil do GitHub num **ecossistema vivo de criaturas pixel-art** que cresce e sofre metamorfose conforme você programa — colecionável, cheio de curiosidades estilo Discovery Channel, e exibível como um **widget vivo no README do seu perfil do GitHub**.

## 2. Objetivos e não-objetivos

**Objetivos**
- Ser uma vitrine que dá orgulho de exibir e que devs compartilham (motor viral nativo dentro do GitHub).
- Indulgir no que o autor ama: formas de inseto, metamorfose/evolução, raridade, curiosidades, vibe *Monster Hunter*.
- Ser gostoso de construir e barato de manter (passion project; sem pressão de monetização no início).

**Não-objetivos (por ora)**
- Monetização, assinatura, loja.
- App mobile / identificação de insetos reais por foto.
- Rigor taxonômico acadêmico (priorizamos fascínio visual e diversão).
- 3D (ver §8).

## 3. Público

Desenvolvedores com conta no GitHub. Onboarding = login OAuth com GitHub. Qualquer perfil **público** pode ter um embed gerado mesmo sem login (ver §7) — login destrava a reserva completa e a coleção.

## 4. Conceito central

Seu GitHub vira uma **reserva natural viva** organizada em **biomas**. Cada bioma é populado por **espécimes** (criaturas reais) derivados dos seus repositórios. Conforme você programa, os espécimes ganham energia e passam pela **metamorfose**; alguns surgem como **morphs raros** (shiny/albino/melânico). Cada criatura é uma espécie real com **curiosidades** desbloqueáveis. Em ondas futuras, **espécies apex/invasoras** aparecem em biomas inesperados, criando "caçadas" no espírito *Monster Hunter*.

## 5. Mapeamento GitHub → ecossistema (o coração)

| Sinal do GitHub | Vira no BugDex | Regra |
|---|---|---|
| Linguagens usadas (bytes agregados nos repos) | **Biomas** | Cada linguagem mapeada abre um bioma; as linguagens com mais bytes são as mais "prominentes". |
| Repositório | **Espécime** | Cada repo vira uma espécie real do bioma da sua linguagem primária. |
| Atividade / commits / streak | **Energia → metamorfose** | Avança o estágio: ovo → larva → pupa → adulto. |
| Idade + atividade do repo | **Estágio** | Repo novo/pouco ativo = estágio inicial; antigo + ativo = adulto. |
| Stars do repo | **Raridade/prestígio** | Mais stars → espécie mais "magnífica" do pool e brilho maior. |
| Sinais incomuns (hash do repo) | **Morph raro** | shiny/albino/melânico com baixa probabilidade, **determinístico** por repo (estável entre visitas). |
| *(Onda 2+)* Issues abertas | **Pragas/"bugs"** | Pragas infestam o bioma; fechar issues = controle de pragas. |
| *(Onda 2+)* Eventos raros | **Apex/invasoras** | Streak longo, linguagem rara, contribuição em projeto grande → encontro raro. |

**Princípio de determinismo:** dado o mesmo estado do GitHub, o ecossistema computado é sempre o mesmo (mapeamentos via hash estável de `repo_id`/`species`). Isso torna o `ecosystem-engine` puro e testável, e os morphs "justos" (não muda a cada refresh).

### Regras concretas (rascunho, refináveis no plano)
- **Bioma de um repo:** `linguagem_primária → biome` via tabela de conteúdo; linguagem sem mapa → bioma fallback **"Inexplorado"**.
- **Espécie de um repo:** `hash(repo_id) % pool_do_bioma`, com viés por stars (mais stars → espécies mais raras do pool).
- **Estágio de metamorfose:** função de (nº de commits, idade do repo, recência da última atividade) → {ovo, larva, pupa, adulto}.
- **Morph:** `hash(repo_id, "morph")` → shiny (~1/64), albino/melânico (mais raros). Probabilidades ajustáveis pra ser divertido.
- **Biodiversidade:** nº de espécies distintas na coleção.

## 6. Modelo de domínio

- **User** — identidade GitHub (login, avatar, token OAuth).
- **EcosystemSnapshot** — estado computado e cacheado para um usuário num momento (lista de biomas + espécimes + métricas).
- **Biome** — definição de conteúdo (id, nome, tema visual, linguagens associadas, pool de espécies).
- **Species** — espécie real (nome, sprite por estágio, curiosidades, raridade base, bioma).
- **Specimen** — instância derivada de um repo (espécie + estágio + morph + stars + ref do repo).
- **Morph** — variante (normal, shiny, albino, melânico) com regras de cor/sprite.
- **Collection** — espécies/morphs já "descobertos" por um usuário (para a Bug-Dex e biodiversidade).

## 7. Superfície-herói: o embed do perfil

Endpoint `GET /{usuario}.svg` que o dev cola no `README.md` do perfil. Renderiza uma **faixa pixel-art** (diorama horizontal):

```
┌──────────────────────────────────────────────┐
│  🪲 BugDex · @usuario       biodiversidade: 14 │
│  [ selva 🌿 ]   [ caverna 🪨 ]   [ savana 🌾 ] │
│   🦋  🐛           🪲  ✨           🐜  🦗       │
│  raríssimo: Borboleta-coruja (shiny) ★★★★★      │
└──────────────────────────────────────────────┘
```

- Mostra os biomas mais prominentes + alguns espécimes-assinatura + a métrica de biodiversidade + o espécime mais raro.
- **Computável on-the-fly de dados públicos:** qualquer perfil público pode gerar um `.svg` mesmo sem login (impulsiona viralização). Login destrava o site completo e a coleção.
- **Cache:** GitHub serve imagens de README via **Camo** (proxy com cache agressivo). O endpoint precisa de headers de cache adequados e de uma estratégia para refletir atualizações (ex.: revalidação periódica). Gotcha conhecido de widgets de perfil.
- Saída em **SVG** (nítido, leve). Embed animado (GIF/SVG animado) fica para a Onda 2.

## 8. Estilo visual

**Pixel-art 2D.** Decisão técnica chave: o embed do perfil é a superfície-herói e o README do GitHub **só** renderiza imagem/SVG/GIF (sem WebGL). Logo o embed é 2D de qualquer forma. Pixel-art:
- renderiza lindo como SVG/sprite no embed;
- é fácil de animar metamorfose por frames;
- mantém o escopo de arte viável para um passion project.

3D (R3F como o Git City) fica como *talvez no site, em onda futura* — nunca no embed.

**Pipeline de arte (decisão em aberto, default escolhido):** para o MVP, **sprites pixel gerados por IA + curiosidades curadas à mão** (rápido de produzir os ~48 espécimes). Arte desenhada à mão fica como polimento de onda futura. *(Revisável — ver §16.)*

## 9. Escopo em ondas (visão ampla, entrega enxuta)

**MVP (v1)**
- Login com GitHub (OAuth).
- Ingestão: linguagens, repos, atividade/contribuições, stars.
- ~8 biomas + ~6 espécies reais cada (~48 insetos), com sprites por estágio.
- Metamorfose por estágio (ovo→larva→pupa→adulto).
- Morphs shiny determinísticos (raridade).
- Página "Sua Reserva": biomas + espécimes; clicar num espécime abre a ficha da espécie + 1 curiosidade.
- **Embed SVG do perfil** (a superfície-herói) + página com snippet copia-e-cola.

**Onda 2**
- Apex/invasoras (vibe *Monster Hunter*): encontros raros em biomas inesperados.
- Embed animado (GIF / SVG animado).

**Onda 3**
- Biomas aquáticos + marinhos/abissais e taxa amplo (artrópodes, crustáceos, criaturas exóticas) — a visão ampla de longo prazo.
- Comunidade: comparar reservas, ranking, kudos.
- Pragas/"bugs" a partir de issues abertas.

**Onda 4**
- Loja/customização, conquistas.

## 10. Arquitetura & módulos (cada um isolado e testável)

- `github-ingest` — busca e normaliza dados do GitHub (GraphQL). Mockável.
- `ecosystem-engine` — **funções puras**: dados normalizados → modelo de ecossistema (biomas, espécimes, estágios, morphs). O núcleo, fortemente testado.
- `content` — dataset curado: definições de biomas (linguagem→bioma), pool de espécies por bioma (sprites + curiosidades), regras de morph.
- `render-web` — renderização pixel-art no browser (canvas/CSS `image-rendering: pixelated`).
- `render-embed` — geração do SVG do widget no servidor.
- `persistence` — schema + repositórios (usuários, snapshots, coleção).
- `web-app` — páginas Next.js (landing, Sua Reserva, ficha de espécie, página do embed).

**Fronteiras:** `ecosystem-engine` não conhece HTTP nem GitHub — recebe dados normalizados e devolve o modelo. `content` é dado, não lógica. `render-*` consomem o modelo do engine. Isso mantém o núcleo testável e o conteúdo editável sem mexer em código.

## 11. Stack (espelha o que funciona no Git City; barato)

- **Next.js (App Router) + TypeScript + Tailwind** — um app serve o site **e** o endpoint do SVG (rotas serverless).
- **Supabase** (Postgres + OAuth GitHub) — auth + banco no free tier.
- **GitHub GraphQL API** — calendário de contribuições, linguagens, repos, stars.
- **Vercel** — host gratuito, ótimo para rotas serverless do SVG com cache.
- Pixel-art: sprites PNG/SVG (sem engine pesada no MVP).

*(Stack é proposta de partida; pode ser revista no plano de implementação.)*

## 12. Fluxo de dados

1. Usuário acessa o site → **OAuth GitHub** → persiste usuário + token.
2. `github-ingest` busca dados (GraphQL) → normaliza.
3. `ecosystem-engine` computa o ecossistema (determinístico) → `persistence` cacheia o `EcosystemSnapshot`.
4. Site (`render-web`) renderiza a partir da cache.
5. Embed (`render-embed`) lê a cache **ou** computa on-the-fly de dados públicos (perfil sem login) → SVG → headers de cache.
6. Em novas visitas (ou via job periódico), recomputa conforme o GitHub evolui → a metamorfose avança.

## 13. Persistência (esboço de tabelas)

- `users` (id, github_login, avatar, token, timestamps)
- `ecosystem_snapshots` (user_id, payload JSON do modelo computado, computed_at)
- `collection` (user_id, species_id, morph, first_seen_at)
- Conteúdo (`biomes`, `species`, `morphs`) pode viver como dados versionados em código (`content/`) em vez de tabelas, para facilitar curadoria — decidir no plano.

## 14. Tratamento de erros & casos de borda

- **Rate limit do GitHub** → usar token OAuth + cache de snapshots; backoff.
- **Usuário sem repos / só repos privados** → reserva "vazia" com call-to-action; embed mostra estado inicial simpático.
- **Linguagem fora do mapa** → bioma fallback **"Inexplorado"**.
- **Cache do Camo** (proxy de imagem do GitHub) → headers de cache + estratégia de revalidação.
- **Perfil inexistente / privado no embed on-the-fly** → SVG de erro amigável.

## 15. Estratégia de testes

- **Unit** no `ecosystem-engine`: mesmo input → mesmo ecossistema (determinismo); cobertura das regras de bioma/espécie/estágio/morph.
- **Snapshot** do SVG do `render-embed`.
- **Integração** da ingestão com GitHub **mockado** (fixtures de payload GraphQL).
- Casos de borda do §14 como testes explícitos.

## 16. Riscos & itens em aberto

- **Conteúdo é o verdadeiro trabalho:** ~48 sprites pixel + curiosidades. *Default do MVP:* sprites por IA + curadoria de fatos. Revisar se quiser arte à mão.
- **Mapeamento linguagem→bioma e repo→espécie** precisa de curadoria boa pra parecer "certo" e divertido.
- **Cache do Camo** pode atrasar a atualização visível do embed — validar cedo.
- **Determinismo vs. evolução:** morphs são fixos por repo; estágios mudam com atividade. Garantir que isso seja claro pro usuário.

## 17. Próximos passos

1. Revisão final deste spec pelo autor.
2. Invocar a skill **writing-plans** para gerar o plano de implementação detalhado (ainda sem código).
3. (Pendente) Criar o repositório vazio no GitHub e configurar o remote/push.
