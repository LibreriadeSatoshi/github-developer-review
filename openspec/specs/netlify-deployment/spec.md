## ADDED Requirements

### Requirement: Netlify deployment configuration
The project SHALL include a `netlify.toml` file that configures the Next.js plugin and build settings so the app can be deployed on Netlify without manual configuration.

#### Scenario: Build succeeds on Netlify
- **WHEN** a new deploy is triggered on Netlify
- **THEN** the build uses `npm run build` and the `@netlify/plugin-nextjs` adapter handles SSR, API routes, and image optimization

#### Scenario: Missing netlify.toml causes deploy failure
- **WHEN** `netlify.toml` is absent from the repository
- **THEN** Netlify SHALL NOT automatically detect the correct Next.js configuration and deployment SHALL fail or produce a broken site

### Requirement: Next.js plugin dependency declared
The `@netlify/plugin-nextjs` package SHALL be listed as a dev dependency in `package.json` so the plugin is available during the Netlify build.

#### Scenario: Plugin installed on Netlify build
- **WHEN** Netlify installs npm dependencies before building
- **THEN** `@netlify/plugin-nextjs` SHALL be present and loaded by the `netlify.toml` plugin declaration
