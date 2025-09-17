<p align="center">
  <img src="https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/levi.PNG" alt="npc studio logo with Levi the dog howling at the moon" width="400" height="400">
</p>


# NPC Studio

NPC Studio is an AI IDE that lets users have conversations with LLMs and Agents, edit files, explore data, execute code, and much more.

Executables available for Linux, MacOS, and Windows at [our website](https://enpisi.com/npc-studio).
At the moment, NPC Studio requires you to independently have ollama installed (or other API keys within .env files) and for you to have pulled models yourself. In future releases, we intend to bundle a program that can install ollama and models from within NPC Studio itself. We also aim to provide inference for users who don't have the local hardware necessary to run models. 
If you have issues during installation, please let us know!

## Demo video:

<a href="https://www.youtube.com/watch?v=rXkc2CrLNb4" target="_blank">
  <img src="https://img.youtube.com/vi/rXkc2CrLNb4/0.jpg" alt="Watch the video" />
</a>


## Installation

When installed via the executables or if you manually build npc-studio yourself, then it will be available as
```bash
npc-studio
```

### Requirements

- Node.js 16 or higher
- Python 3.8 or higher (for the backend)
- Ollama (optional, for local models)

# Using NPC Studio

## Chat with Agents and organize by project path
- NPC Studio gives users the capability to organize their conversations with AI agents in a natural and convenient way. Users can easily change working directories and separate their conversations by project path.

![npc studio chat window interface](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/chat_window.png)

See thinking traces from agents:
![npc studio chat window thinking trace](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/reasoning.png)

- Aggregate conversations:

![select multiple conversations](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/convo_agg.png)

-![Aggregate messages](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/agg_messages.png) 



## Use agent mode
Coming soon...

## Create and manage agents, tools
- NPC Studio uses the `npcpy` agent framework to simplify the building and orchestration of AI agents.

![edit your agents](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/edit_npcs.png)

- Additionally, users can create and manage tools to be used by agents. 
![edit your tools](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/tool.png)


## Edit plain text files
- NPC Studio is not just a chat interface, users can also edit plain text files (with agent-based integrations soon to come).

![npc studio interface for editing plain text files](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/code_editor.png)



## Analyze text files with AI
![Editing plain text files](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/fill_analyze.png)

## Use tiles to have a conversation while editing

![Editing plain text files](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/tiled_chat_ai.png)

## Collapse Sidebar, Delete convos, access team menu, jinx menu, photo studio, data dash


![Collapse the sidebar, delete](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/collapse_delete.png)


## Or while browsing

![Editing plain text files](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/tiled_pdf_browser.png)

## Edit settings 

### Global Settings

![npc studio global settings](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/default_settings.png)


### Project Settings

![npc studio env variables for project settings](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/env_variables.png)

-When working in a specific folder, NPC Studio will discover an `.env` file if it's present and will use these API keys to determine which models can be used within the project.

![npc studio chat model selector](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/model_selector.png)



# Data Dashboard


## Activity Dashboard

The long-awaited for activity dashboard: now with composable widgets, a setup for running queries, exporting data, plotting data, and with natural language to sql!


![Data Dash](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/data_dash.png)

![Database Schema](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/db_viewer.png)

![Database Querying](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/db_query.png)

### Edit and manage memories

![A database table showing user memories](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/memory_crud.png)
 
### Explore your knowledge graph

![A knowledge graph showing nodes and edges and facts and concepts](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/kg_inspector.png)




# Vixynt: Your visual playground and assistant

## Use AI on photos

![Photo Editing Tools](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/photo_editor.png)

## Edit and generate Photos with AI

![Vixynt editing](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/vixynt_image_edit.png)


## Edit photos in DarkRoom

![Simple photo editor](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/darkroom.png)

## Adjust Metadata
Coming Soon...

## Label images
Coming Soon...


# Web Browsing
## Browse the web with AI at your fingertips
![AI powered web browser](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/ai_web_browsing.png)


# PDF Analysis

## Analyze and highlight in pdfs 
![PDF Analysis](https://raw.githubusercontent.com/npc-worldwide/npc-studio/main/gh_images/pdf_highlight.png)



## Getting Started with Development

NPC studio is electron-based frontend with a python flask backend.


Before getting started with development, ensure that you have the following installed
- [npcpy](https://github.com/npc-worldwide/npcpy)
- node+npm
- ollama (if you plan to rely on local models)

```bash
git clone https://github.com/npc-worldwide/npc-studio.git
```

```bash
npm install
```
Start the electron backend:
```bash
npm run dev
```
Start the flask backend:

```
Alternatively use the wrapper script that is provided
```bash
python npc_studio_serve.py
```
Start the electron frontend:
```bash
npm start
```


## Build 
Linux:
```bash
./build.sh
```
This will build the frontend and backend into a single executable file. 

Mac:
```bash
./build-mac.sh
```
Windows:
```
.\build.bat
```

### License
NPC Studio is licensed under AGPLv3 with additional terms explicitly prohibiting the offering of third-party SaaS services which provide a user access to any web-hosted version of the software as well as prohibiting the packaged re-sale of the product. Please see the [LICENSE](LICENSE) file for further details.

