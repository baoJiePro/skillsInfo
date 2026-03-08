# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SkillsInfo is a multi-Agent skills repository and team framework for AI agents (Claude/OpenClaw). It consists of:

1. **Agent Skills Library**: Reusable skill definitions (`.md` files in `skills/`) that define AI agent capabilities and execution flows
2. **Multi-Agent Team Framework**: "Commander + Specialist Legion" architecture with 10+ specialized agents coordinated through a central commander
3. **Tech Doc Expander**: An intelligent documentation expansion skill that recursively fetches technical articles and supplements them with official documentation

## Key Architecture

### Multi-Agent Coordination Model

The project uses a **Commander Pattern** where:
- **commander-grove** (Andy Grove persona): Single user interface, task analysis/distribution, result aggregation
- **10 Specialist Agents**: CEO, CTO, FullStack, QA, Product, UI, Marketing, Sales, Operations, Interaction
- **Document-Driven Collaboration**: Agents coordinate through shared workspace documents (`docs/workspace/tasks/`, `docs/workspace/knowledge/`)

### Agent-Script Hybrid Model

Skills use a two-layer architecture:
- **Agent Layer**: Claude/OpenClaw agents for intelligent decision-making and analysis
- **Script Layer**: TypeScript scripts in `scripts/` for technical execution (web scraping, document generation)
- **MCP Integration**: Model Context Protocol for external tools (web-reader, context7)

### Directory Structure

```
skillsInfo/
├── agentsInfo/          # Agent SOUL definitions (.md files)
│   ├── commander-grove.md
│   ├── ceo-bezos.md
│   ├── cto-vogels.md
│   └── [other specialists]
├── skills/              # Reusable skills
│   └── tech-doc-expander/
│       ├── SKILL.md              # Skill definition/execution flow
│       ├── README.md             # Feature documentation
│       ├── INSTALL_GUIDE.md      # Installation instructions
│       ├── package.json          # npm dependencies
│       ├── scripts/              # TypeScript implementation
│       │   ├── main.ts
│       │   ├── fetcher.ts
│       │   ├── analyzer.ts
│       │   └── generator.ts
│       └── templates/            # Document templates
├── output/              # Generated documentation
└── .claude/             # Claude Code configuration
    └── settings.local.json
```

## Essential Commands

### OpenClaw Agent Team Initialization

```bash
# Initialize multi-agent team workspace
./init-commander.sh
```

This script:
- Creates workspace directory structure in `~/.openclaw/workspaces/`
- Deploys SOUL.md files to each agent's workspace
- Creates symbolic links for shared workspace access
- Supports 11 agents: commander-grove + 10 specialists

### Skill Installation

```bash
# Install tech-doc-expander skill dependencies
cd ~/.claude/skills/tech-doc-expander
npm install  # or: bun install

# Add global skills (markdown-url, baoyu-url-to-markdown)
npx skills add am-will/codex-skills/markdown-url -g -y
npx skills add jimliu/baoyu-skills/baoyu-url-to-markdown -g -y
```

### Using Tech Doc Expander Skill

```
使用 tech-doc-expander 处理：https://blog.example.com/article
```

The skill will:
1. Fetch content using MCP Web Reader
2. Analyze and identify technology stack (50+ technologies)
3. Query official documentation via Context7 MCP
4. Recursively fetch related links
5. Generate comprehensive implementation guide with:
   - Article overview and tech stack
   - Extended resources (official docs, GitHub repos)
   - Complete implementation steps
   - Troubleshooting guide
   - Further reading

### Running TypeScript Scripts

```bash
# From skill directory
cd skills/tech-doc-expander
bun run scripts/main.ts           # Main entry
bun run scripts/main.ts discover  # Discovery mode
```

## Agent Coordination Workflow

### Task Flow

```
User Request → Commander Analysis → Task Directory Creation →
Specialist Execution → Document Writing → Commander Aggregation →
Final Response
```

### Task Directory Pattern

Tasks are organized in shared workspace:
```
~/.openclaw/workspaces/commander-grove/docs/workspace/
└── tasks/
    └── TASK-{ID}-{name}/
        ├── brief.md          # Task brief
        ├── [agent]-output.md # Individual agent outputs
        └── summary.md        # Aggregated results
```

### Agent Selection Matrix

The commander uses this decision matrix:

| Complexity | Development | Product | Operations | Decision |
|------------|-------------|---------|------------|----------|
| Simple     | Direct      | Direct  | Direct     | Direct   |
| Medium     | CTO + FullStack | Product + UI | Marketing/Operations | CEO |
| Complex    | CEO → CTO → FullStack → QA | Product → Interaction → UI | Marketing + Sales + Operations | CEO + CTO |

## Skill Development Pattern

### Creating New Skills

1. Create directory under `skills/{skill-name}/`
2. Add `SKILL.md` with:
   - Skill metadata (name, description)
   - Agent collaboration mode
   - Execution flow steps
   - MCP tool usage examples
   - Configuration options
   - Troubleshooting guide
3. Add `package.json` with dependencies
4. Implement TypeScript scripts in `scripts/`
5. Add documentation: `README.md`, `INSTALL_GUIDE.md`
6. Update `skills/INDEX.md`

### SKILL.md Format

Skills must define:
- **When to use**: Clear usage scenarios
- **Agent-Script collaboration**: How Agent and scripts work together
- **Execution flow**: Step-by-step process
- **MCP tools**: Required external tools and usage
- **Fallback strategies**: What to do when tools fail
- **Configuration options**: Available settings

## MCP Server Dependencies

### Required MCP Servers

Configure in `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "web-reader": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-web-reader"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

### MCP Tool Usage

- **mcp__web_reader__webReader**: Fetch web content as markdown
- **mcp__context7__resolve-library-id**: Resolve library names for documentation queries
- **mcp__context7__query-docs**: Query official documentation

## Agent Persona Files

Each agent in `agentsInfo/` has a SOUL.md file defining:
- **Role**: Specific responsibilities
- **Persona**: Character/mindset (e.g., Andy Grove's management philosophy)
- **Core principles**: Decision-making framework
- **Task collaboration mode**: How to work with commander and other agents
- **Communication style**: Tone and format
- **Output format**: Expected document structure

## Important Architectural Patterns

### Black Box Management

Commander treats specialist agents as "black boxes":
- Input: Clear task definition with required context
- Processing: Agent's internal logic (not visible to commander)
- Output: Structured document deliverable

Focus on defining clear interfaces rather than understanding internal implementation.

### Document-Driven State Management

- Agents communicate through documents, not conversation history
- State is stored in markdown files in shared workspace
- Each agent writes output to designated files
- Commander reads these files for aggregation

### Sequential vs Parallel Execution

Commander determines execution strategy based on task dependencies:
- **Sequential**: A → B → C (when B depends on A's output)
- **Parallel**: A, B, C → aggregate (when independent)
- **Iterative**: A → B → C → feedback → A' → B' → C' (for refinement loops)

## Configuration Files

### .claude/settings.local.json

Contains extensive `permissions.allow` list for:
- Skills discovery and installation (`npx skills find/add/info`)
- Web content fetching (`curl` commands)
- Git operations (commit, push, status)
- Script execution and skill management

### Git Workflow

```bash
git add .claude/settings.local.json agentsInfo/ output/
git commit -m "$(cat <<'EOF'
feat: descriptive commit message

- Key change 1
- Key change 2
EOF
)"
git push
```

## Tech Stack Recognition

The system automatically recognizes 50+ technologies including:

**Frontend**: React, Vue, Angular, Svelte, Next.js, Nuxt
**Backend**: Express, NestJS, Django, FastAPI, Spring
**Database**: PostgreSQL, MongoDB, Redis, MySQL
**DevOps**: Docker, Kubernetes
**Cloud**: AWS, Azure, GCP
**Build Tools**: Webpack, Vite, esbuild
**Testing**: Jest, Vitest, Playwright, Cypress

When analyzing articles, identify technologies and supplement with official documentation.
