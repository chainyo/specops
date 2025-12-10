# SpecOps

### *An open-source AI-assisted engineering cockpit powered by OpenSpec.*

SpecOps is a macOS desktop app (built with Tauri + React) that helps developers work more cleanly with AI coding tools by combining:

* **OpenSpec** → structured intent
* **Git worktrees** → safe parallel branches
* **Local AI agents** → optional code generation and planning
* **A cockpit-style dashboard** → visibility over projects & specs

This project is in **early development**.
The initial goal is to build a minimal foundation before adding any advanced workflows.

---

## 🔧 Local Development

### 1. Install dependencies

```bash
bun install
```

### 2. Start the app

```bash
bun tauri dev
```

### 3. Build

```bash
bun tauri build
```

---

## 📍 First Feature: Project Discovery

The first OpenSpec-defined feature is:

> Let the user add local git repos and display whether they contain an `openspec/` folder.

This establishes:

* backend → frontend communication
* filesystem checks via Tauri
* Zustand state management
* basic UI layout

Once this is solid, more features will be stacked on top.

---

## 🧪 Testing

**Frontend**

* vitest + React Testing Library
* minimal store sanity tests

**Backend**

* unit tests for git/FS detection
* clippy must pass

---

## 🤝 Contributing

This project is at the foundation stage. Contributions are welcome, especially for:

* refining early architecture
* improving DX (commands, structure, state)
* UI polish for the project list
* testing setup

Please open an issue before working on larger changes.

---

## 📄 License

MIT
