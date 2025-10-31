# GitHub Actions Workflow Troubleshooting

## Common Issues and Solutions

### Issue: npm Cache Dependency Path Not Found

**Error Message:**
```
Some specified paths were not resolved, unable to cache dependencies.
```

**Cause:**
The `setup-node` action's `cache-dependency-path` option requires `package-lock.json` files to exist. If these files don't exist in the repository, the caching step fails.

**Solution:**
The workflow has been updated to use explicit `actions/cache@v3` steps instead, which handle missing files gracefully. The workflow now:

1. Uses `actions/cache@v3` with `continue-on-error: true`
2. Checks for `package-lock.json` before running `npm ci`
3. Falls back to `npm install` if lock files don't exist

**Fixed in:** Workflow version with explicit cache actions

### Issue: Deployment Fails Due to Missing Secrets

**Error Message:**
```
Error: Input required and not supplied: AZURE_CREDENTIALS
```

**Solution:**
1. Go to Repository Settings → Secrets and variables → Actions
2. Add all required secrets listed in `.github/workflows/README.md`
3. Ensure service principal has correct permissions

### Issue: Bicep Deployment Fails

**Error Message:**
```
Error: Deployment template validation failed
```

**Solution:**
1. Validate Bicep template locally first:
   ```bash
   az deployment group validate \
     --resource-group <rg-name> \
     --template-file infra/main.bicep \
     --parameters @infra/parameters.json
   ```
2. Check for resource name conflicts (storage accounts, ACR names must be globally unique)
3. Verify parameter values are correct

### Issue: Docker Build Fails

**Error Message:**
```
Error: failed to solve: failed to fetch
```

**Solution:**
1. Verify Dockerfile syntax is correct
2. Check base image is available
3. Ensure ACR credentials are correct
4. Verify network connectivity in GitHub Actions runner

### Issue: Function App Deployment Fails

**Error Message:**
```
Error: Function app not found
```

**Solution:**
1. Ensure infrastructure deployment completed successfully
2. Verify Function App name matches deployment output
3. Check Function App exists in resource group:
   ```bash
   az functionapp list --resource-group <rg-name>
   ```

### Issue: Tests Not Running

**Error Message:**
```
No test files found
```

**Solution:**
1. Ensure test files exist in `runner/` directory
2. Check test file naming convention (`.spec.js`)
3. Verify Docker image builds correctly
4. Check test execution logs for specific errors

### Issue: Cache Not Working

**Symptoms:**
- Dependencies install every time (slow builds)
- Cache step shows "Cache not found"

**Solution:**
1. Ensure `package-lock.json` files are committed to repository
2. Verify cache keys are consistent across runs
3. Check cache size limits (GitHub Actions has 10GB limit)
4. Review cache hit/miss in workflow logs

### Issue: Workflow Times Out

**Error Message:**
```
Error: The operation was canceled
```

**Solution:**
1. Increase timeout for long-running jobs:
   ```yaml
   timeout-minutes: 30
   ```
2. Optimize Docker builds (use multi-stage builds)
3. Split jobs into smaller parallel jobs
4. Use matrix strategies for parallel execution

### Issue: Permission Denied Errors

**Error Message:**
```
Error: Permission denied (publickey)
```

**Solution:**
1. Verify Azure service principal has correct roles:
   - Contributor role on resource group
   - ACR push permissions
2. Check PAT (Personal Access Token) permissions in Azure DevOps
3. Verify GitHub Actions has access to secrets

### Issue: Environment Variables Not Set

**Error Message:**
```
Error: Environment variable not set
```

**Solution:**
1. Check environment variables are set in Function App:
   ```bash
   az functionapp config appsettings list \
     --resource-group <rg-name> \
     --name <function-app-name>
   ```
2. Verify secrets are correctly named in GitHub
3. Check environment-specific settings match

## Debugging Tips

### Enable Debug Logging

Add to workflow file:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Check Workflow Logs

1. Go to Actions tab in GitHub
2. Click on failed workflow run
3. Expand job and step logs
4. Look for error messages and stack traces

### Test Locally First

Before pushing to GitHub:
1. Run tests locally: `npm test`
2. Validate Bicep: `az deployment group validate`
3. Test Docker build: `docker build -t test .`
4. Test Function App locally: `func start`

### Verify Dependencies

Check that all required files exist:
- `backend/package.json`
- `frontend/package.json`
- `runner/Dockerfile`
- `infra/main.bicep`

## Workflow Optimization

### Reduce Build Time

1. Use dependency caching (already implemented)
2. Use Docker layer caching
3. Run tests in parallel
4. Skip unnecessary steps on certain branches

### Reduce Costs

1. Use scheduled workflows sparingly
2. Clean up old artifacts and caches
3. Use appropriate VM sizes
4. Optimize Docker images (smaller = faster)

## Getting Help

If issues persist:
1. Check GitHub Actions documentation
2. Review Azure Functions logs
3. Check Application Insights (if enabled)
4. Review workflow run logs in detail
5. Test components individually

## Workflow Status Checks

You can check workflow status programmatically:

```bash
# Get latest workflow run status
gh run list --workflow=deploy.yml --limit 1

# View workflow run details
gh run view <run-id>
```
