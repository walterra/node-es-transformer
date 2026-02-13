# Contributing to node-es-transformer

Thank you for your interest in contributing to node-es-transformer. This document outlines the process for contributing to this project.

## Code of Conduct

Be kind. Be inclusive. Assume good intent.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies: `yarn`
4. Create a feature branch: `git checkout -b feature/my-feature`

## Development Setup

### Requirements

- Node.js 22+ (see `.nvmrc`)
- Docker (for running tests)
- yarn package manager

### Initial Setup

```bash
git clone https://github.com/YOUR_USERNAME/node-es-transformer
cd node-es-transformer
yarn
```

### Building

```bash
yarn build      # Build library to dist/
yarn dev        # Build and watch for changes
```

## Testing

This project uses Testcontainers to automatically manage Elasticsearch containers during tests.

### Running Tests

```bash
yarn test                    # Standard tests (ES 9.3.0 by default)
ES_VERSION=8.17.0 yarn test  # Test against specific ES version
yarn test:cross-version      # Cross-version reindexing tests (8.x → 9.x)
```

### Requirements

- Docker daemon running (`docker ps` to verify)
- At least 2GB available memory (4GB for cross-version tests)
- First run downloads ES Docker image (one-time setup)

### Writing Tests

- Add test files to `__tests__/` directory
- Follow existing patterns in test files
- Test against both ES 8.x and 9.x when relevant
- Ensure tests clean up after themselves

## Code Quality

### Linting and Formatting

```bash
yarn lint       # Check code style
```

This project uses ESLint with Prettier integration. Code style is enforced in CI.

### Commit Messages

Use Commitizen for commit messages:

```bash
cz              # Interactive commit message wizard
```

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or changes
- `chore:` Maintenance tasks
- `refactor:` Code restructuring

## Making Changes

### Before You Start

**Important**: Before investing time in a PR, please check with the maintainer first:

1. Open an issue describing your proposed change
2. Wait for maintainer feedback on whether it aligns with project goals
3. Discuss implementation approach if needed

This prevents surprise rejections and wasted effort on changes that may not fit the project direction.

### Pull Request Process

1. Get approval on an issue first (see above)
2. Create a feature branch from `main`
3. Make your changes
4. Add tests for new functionality
5. Run `yarn lint` and `yarn test`
6. Create a changeset (see below)
7. Commit using `cz`
8. Push to your fork
9. Open a pull request referencing the issue

### Changesets

Every PR that affects functionality must include a changeset:

```bash
yarn changeset
```

This creates a markdown file in `.changeset/` describing your change. Follow the prompts to:

1. Select bump type:
   - **patch**: Bug fixes, documentation
   - **minor**: New features, non-breaking changes
   - **major**: Breaking changes
2. Write a concise summary for the changelog

**One changeset per PR** - combine all changes into a single changeset with the highest version bump needed.

### Version Bump Guidelines

- **patch** (0.0.x): Bug fixes, docs, internal refactors
- **minor** (0.x.0): New features, non-breaking API additions
- **major** (x.0.0): Breaking changes, API removals

## Pull Request Guidelines

### Before Submitting

- [ ] Tests pass (`yarn test`)
- [ ] Linting passes (`yarn lint`)
- [ ] Changeset created (`yarn changeset`)
- [ ] Commits use Commitizen (`cz`)
- [ ] Documentation updated if needed

### PR Description

- Describe what changed and why
- Reference any related issues
- Include examples if adding new features
- Note any breaking changes

### Review Process

1. Automated CI checks must pass (tests, linting)
2. At least one maintainer review required
3. Address review feedback
4. Maintainer will merge when approved

## Release Process

Releases are automated via Changesets:

1. Changesets in merged PRs accumulate on `main`
2. Release PR is automatically created with version bumps
3. Maintainer merges release PR
4. Package is automatically published to npm
5. GitHub release is created with changelog

## Project Structure

Key directories:

- `src/` - Source code
- `__tests__/` - Test files
- `test/` - Test setup and utilities
- `dist/` - Built output (generated, not committed)
- `.changeset/` - Changeset files

## Documentation

- [README.md](README.md) - User-facing documentation
- [DEVELOPMENT.md](DEVELOPMENT.md) - Developer setup and workflows
- [AGENTS.md](AGENTS.md) - Detailed project architecture and conventions

## Getting Help

- Open an issue for bug reports or feature requests
- Use GitHub Discussions for questions
- Check existing issues and PRs before opening new ones

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
