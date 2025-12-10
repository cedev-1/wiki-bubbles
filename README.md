# Wiki Bubbles

A minimalist Wikipedia knowledge explorer that visualizes article connections as an interactive blubble graph.

<img width="1866" height="897" alt="image" src="https://github.com/user-attachments/assets/d998b6be-133c-4879-ba0c-7d1d11c60e28" />

## Setup

### Installation

Clone the repository:
   ```bash
   git clone https://github.com/cedev-1/wiki-bubbles.git
   cd wiki-bubbles
   ```

Allow direnv:
   ```bash
   direnv allow
   ```

Install dependencies:
   ```bash
   bun install
   ```

Start development server:
   ```bash
   bun run dev
   ```

### Nix Environment

This project uses Nix for reproducible development environments. The `flake.nix` provides:

- Bun runtime
- direnv for automatic environment loading

When you enter the directory, direnv will automatically load the Nix environment.

## Usage

1. Enter a Wikipedia URL or article title
2. Click on bubbles to navigate and expand the graph
3. Use controls to switch language/theme

## Deployment

Live demo: [https://cedev-1.github.io/wiki-bubbles/](https://cedev-1.github.io/wiki-bubbles/)

## License

License [MIT](LICENSE).
