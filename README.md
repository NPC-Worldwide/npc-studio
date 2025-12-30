<p align="center">
  <img src="https://raw.githubusercontent.com/npc-worldwide/incognide/main/levi.PNG" alt="Incognide logo with Levi the dog howling at the moon" width="400" height="400">
</p>

<h1 align="center">Incognide</h1>

<p align="center">
  <strong>Explore the unknown and build the future.</strong>
</p>

<p align="center">
  <a href="https://github.com/npc-worldwide/incognide/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3%20%2B%20restrictions-blue.svg" alt="License"></a>
  <a href="https://enpisi.com/incognide"><img src="https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg" alt="Platforms"></a>
  <a href="https://github.com/npc-worldwide/incognide/releases"><img src="https://img.shields.io/github/v/release/npc-worldwide/incognide?include_prereleases" alt="Release"></a>
</p>

<p align="center">
  <a href="https://enpisi.com/incognide"><strong>Download for Linux, macOS, and Windows</strong></a>
</p>

---

Incognide combines chat, code, documents, web browsing, multi-media management, and much more into a tiled workspace desktop environment with smart context and composable automations.

### Highlights

- Write and run code, use terminals, build reusable workflows and tools that chain together natural language and templateable code through jinja execution templates.
- Browse the web, read and annotate PDFs, analyze data and create dashboards, compile LaTeX.
- Edit DOCX, XLSX, PPTX, MAPX.
- Arrange chats, editors, PDFs, browsers, terminals as your work evolves.
- Manage agents, team context, MCP Server integrations, memory, and knowledge graphs.

## Demo Video

<a href="https://www.youtube.com/watch?v=rXkc2CrLNb4" target="_blank">
  <img src="https://img.youtube.com/vi/rXkc2CrLNb4/0.jpg" alt="Watch the video" />
</a>

## Quick Start

1. **Download** the installer for your platform from [enpisi.com/incognide](https://enpisi.com/incognide)
2. **Run** the installer and launch Incognide
3. **Configure** your models:
   - **Local models**: Install [Ollama](https://ollama.ai), [LM Studio](https://lmstudio.ai), or run a [llama.cpp server](https://github.com/ggerganov/llama.cpp)
   - **Cloud providers**: Add API keys in Settings (gear icon) for OpenAI, Anthropic, Gemini, etc.
4. **Start chatting** - select a model and begin a conversation

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
  - [AI Chat & Conversations](#ai-chat--conversations)
  - [File Editing](#file-editing)
  - [Document Viewers](#document-viewers)
  - [Web Browsing](#web-browsing)
  - [Vixynt (Image Tools)](#vixynt-your-visual-assistant)
  - [Data Dashboard](#data-dashboard)
  - [Agent Management](#agent-management)
- [Themes & Settings](#themes)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Installation](#installation)
- [Development](#development)
- [Community](#community)
- [License](#license)

---

## Features


### AI Chat & Conversations


![Chat Window](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/chat.png)


**Aggregate Conversations**: Select and combine multiple conversations:

![Select Conversations](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/convo_agg.png)
![Aggregate Messages](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/agg_messages.png)

**Include Attachments**: Attach files to your conversations:

![Include Attachments](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/include_attachments.png)

**Model Selection**: Choose from available models based on your environment:

![Model Selector](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/model_selector.png)

**Agentic Tool use**: Enable agents to use tools from MCP Servers or your local Jinxs during conversations:

![MCP Tool Use](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/mcp_tool_use.png)


---

### File Editing

Edit code and text files with syntax highlighting.

![Code Editor](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/code_editor.png)

Execute python scripts

![script execution](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/script_execution.png)

![latex compilation](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/latex.png)
**AI-Powered Analysis**: Analyze files with AI assistance:

![Analyze Files](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/analyze_files.png)

**Tiled Layout**: Edit files while chatting with AI:

![Tiled Chat](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/tiled_chat_ai.png)

---


### Document Viewers

**DOCX & XLSX Support**: Edit Word documents and Excel spreadsheets with full functionality:

![DOCX and XLSX Editing](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/docx_xlsx.png)

![CSV Editing](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/csv.png)

![PPTX Editing](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/pptx.png)


**PDF Analysis**: Highlight and analyze PDF documents:

![PDF Highlighting](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/pdf_highlight.png)

![Folder contents](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/folder_explorer.png)

---

### Web Browsing

Browse the web with AI assistance at your fingertips.

![AI Web Browsing](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/browse_and_wait.png)

**Tiled Browsing**: Browse while viewing PDFs or chatting:

![Tiled PDF Browser](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/tiled_pdf_browser.png)

---

### Vixynt: Your Visual Assistant

**Photo Editor**: Browse photos

![Photo Editor](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/vixynt.png)

**AI Image generation with references**:

![Vixynt Editing](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/vixynt_image_edit.png)

**DarkRoom**: Simple photo cropping, editing, and styling.

![DarkRoom](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/darkroom.png)

---

### Data Tools

Composable widgets for analytics, querying, and visualization.

![Data Dashboard](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/data_dash.png)

**Database Schema Viewer**:

![Database Schema](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/db_viewer.png)

**SQL Querying**: Run queries with natural language to SQL:

![Database Query](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/db_query.png)

**Memory Management**: Edit and manage agent memories:

![Memory CRUD](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/memory_crud.png)

**Knowledge Graph Explorer**:

![Knowledge Graph](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/kg_inspector.png)


![Disk usage](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/disk_usage_analyzer.png)


![PDF Library](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/library.png)


---

### Agent team and context management

**Create and Edit NPC Personas**: edit the primary directive, model, provider, and jinxs for your persona.

![Edit NPCs](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/agent_editor.png)

![Agent History](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/npc_history.png)

![Agent memories](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/memories.png)

![Agents in SQL models](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/nql.png)

**Jinx Management**: Create and manage Jinxs for agents:

![Jinx Editor](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/jinx.png)

**Jinx Execution**: Run jinx workflows:

![Jinx Execution](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/jinx_execution.png)

**SQL Jinx**:

![SQL Jinx](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/sql_jinx.png)

**Context Editor**: Manage global and project context.

![Context Editor](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/team_management.png)

![Manage mcp servers](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/mcp_server.png)

![Cron jobs](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/cron_daemon.png)


---

## Themes

**Light Mode**: Full light mode support with pink accents:

![Light Mode](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/light_mode.png)

**Sidebar Controls**: Collapse sidebar, delete conversations, access menus:

![Sidebar](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/sidebar.png)

---

## Settings

**Global Settings**: Configure default models and providers:

![Global Settings](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/settings1.png)


![TTS](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/tts_management.png)

![keyboard shortcuts](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/keyboard_shortcuts.png)

![git manager](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/git_manager.png)

![custom api](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/custom_api.png)

![model management](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/model_management.png)

![hf model management](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/hf.png)

**Project Settings**: Set environment variables per project:

![Environment Variables](https://raw.githubusercontent.com/npc-worldwide/incognide/main/gh_images/env_vars.png)



---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New conversation | `Ctrl/Cmd + N` |
| Send message | `Enter` (or `Ctrl/Cmd + Enter` for multiline) |
| Toggle sidebar | `Ctrl/Cmd + B` |
| Open settings | `Ctrl/Cmd + ,` |
| Close current pane | `Ctrl/Cmd + W` |
| Split pane horizontal | `Ctrl/Cmd + \` |
| Focus chat input | `Ctrl/Cmd + L` |

---

## Installation

Pre-built executables are available for **Linux**, **macOS**, and **Windows** at [enpisi.com/incognide](https://enpisi.com/incognide).

### System Requirements

| Component | Requirement |
|-----------|-------------|
| Python | 3.8 or higher |
| Node.js | 16 or higher (for development) |
| Ollama | Optional, for local models |

> **Note**: Incognide includes built-in Ollama management, but this feature may have issues on some systems. Please [report issues](https://github.com/npc-worldwide/incognide/issues) if you encounter problems.

---

## Development

Incognide is an Electron + React frontend with a Python Flask backend powered by [npcpy](https://github.com/npc-worldwide/npcpy).

### Prerequisites

- [npcpy](https://github.com/npc-worldwide/npcpy) - Core Python library
- [npcsh](https://github.com/npc-worldwide/npcsh) - Shell interface (starts the backend)
- Node.js 16+ and npm
- Ollama (optional, for local models)

### Setup

**Option 1: Manual setup**
```bash
git clone https://github.com/npc-worldwide/incognide.git
cd incognide
npm install
```

**Option 2: Via npcsh** (installs to `~/.npcsh/npc_studio`)
```bash
npcsh> /incognide
```

### Running

```bash
# Start both frontend and backend
npm start

# Or run separately:
python npc_studio_serve.py   # Backend
npm run dev                   # Frontend
```

---

## Community

- **Issues & Bugs**: [GitHub Issues](https://github.com/npc-worldwide/incognide/issues)
- **Discussions**: [GitHub Discussions](https://github.com/npc-worldwide/incognide/discussions)
- **NPC Ecosystem**: [npcpy](https://github.com/npc-worldwide/npcpy) | [npcsh](https://github.com/npc-worldwide/npcsh)

---

## License

Incognide is licensed under AGPLv3 with additional terms prohibiting third-party SaaS services and packaged resale. See the [LICENSE](LICENSE) file for details.