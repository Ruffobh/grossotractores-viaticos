# Deployment & Development Log

## Common Errors & Solutions

### 1. Module Not Found (Dependency Issues)
**Error:** `Module not found: Can't resolve 'library-name'` during build.
**Cause:** The library was installed in the local environment but `package.json` and `package-lock.json` were NOT committed to the repository.
**Solution:**
- Always run `git add package.json package-lock.json` after `npm install`.
- Verify `package.json` changes are staged before determining a task is "Complete".
- **Critical**: Next.js Turbopack builds are very strict about missing dependencies.

### 2. PowerShell Script Execution Disabled
**Error:** `npm : No se puede cargar el archivo ... npm.ps1 porque la ejecución de scripts está deshabilitada`.
**Cause:** Windows PowerShell restriction policy.
**Solution:** Use `cmd /c npm install ...` to bypass PowerShell restriction when running commands via the agent.

### 3. Middleware Deprecation
**Warning:** `The "middleware" file convention is deprecated. Please use "proxy" instead.`
**Context:** Next.js warning. Low priority for now but worth noting for future refactors.
