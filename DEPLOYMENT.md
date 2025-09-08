# Deployment Guide

This guide covers packaging and deploying the Enterprise AI Context VSCode extension.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js**: Version 16.x or higher
- **npm**: Latest version
- **vsce**: VSCode Extension Manager (`npm install -g vsce`)
- **Publisher Account**: VSCode Marketplace publisher account (for marketplace deployment)

## 🔍 Pre-Deployment Validation

### Automated Validation

Run the comprehensive validation script:

```bash
npm run validate:deployment
```

This checks:

- ✅ Required files exist
- ✅ package.json is properly configured
- ✅ TypeScript compilation succeeds
- ✅ Main entry point exists
- ✅ Code quality (ESLint)
- ✅ Test coverage
- ✅ Documentation completeness
- ✅ Demo functionality

### Manual Validation Checklist

- [ ] All features work as expected
- [ ] Hover functionality displays business context
- [ ] MCP server starts and responds
- [ ] Status bar indicator works
- [ ] Demo scenarios run successfully
- [ ] AI assistant integration works
- [ ] Configuration settings are respected
- [ ] Error handling works gracefully
- [ ] Performance is acceptable

## 📦 Packaging

### 1. Clean Build

```bash
# Clean previous builds
npm run clean

# Full build with validation
npm run build
```

### 2. Package Extension

```bash
# Create .vsix package
npm run package

# Or manually with vsce
vsce package
```

This creates: `enterprise-ai-context-0.1.0.vsix`

### 3. Validate Package

```bash
# Install locally to test
code --install-extension enterprise-ai-context-0.1.0.vsix

# Test functionality
# - Open TypeScript file
# - Test hover functionality
# - Check status bar
# - Run demo scenarios
```

## 🚀 Deployment Options

### Option 1: VSCode Marketplace (Recommended)

#### Setup Publisher Account

1. **Create Account**: Visit [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. **Create Publisher**: Follow the setup process
3. **Get Personal Access Token**: From Azure DevOps

#### Configure vsce

```bash
# Login with personal access token
vsce login <publisher-name>

# Or set token directly
vsce publish --pat <personal-access-token>
```

#### Publish to Marketplace

```bash
# Publish current version
npm run publish

# Or manually
vsce publish

# Publish specific version
vsce publish 0.1.1
```

### Option 2: Private Distribution

#### Internal Enterprise Distribution

```bash
# Package the extension
npm run package

# Distribute .vsix file internally
# Users install with: code --install-extension enterprise-ai-context-0.1.0.vsix
```

#### GitHub Releases

1. **Create Release**: On GitHub repository
2. **Upload .vsix**: Attach package file
3. **Document Changes**: Include changelog
4. **Tag Version**: Use semantic versioning

### Option 3: Development/Testing

```bash
# Install from source for development
git clone <repository>
cd enterprise-ai-context
npm install
npm run compile
code --extensionDevelopmentPath=.
```

## 🔧 Configuration Management

### Environment-Specific Builds

For different environments, modify package.json:

```json
{
  "name": "enterprise-ai-context-dev",
  "displayName": "Enterprise AI Context (Development)",
  "description": "Development version with debug features"
}
```

### Feature Flags

Configure features for different deployments:

```json
{
  "enterpriseAiContext.features.debugMode": true,
  "enterpriseAiContext.features.advancedLogging": true,
  "enterpriseAiContext.demo.enabled": false
}
```

## 📊 Post-Deployment Validation

### Marketplace Validation

After marketplace publication:

1. **Search**: Find extension in marketplace
2. **Install**: Test installation process
3. **Functionality**: Verify all features work
4. **Reviews**: Monitor user feedback
5. **Analytics**: Check download/usage metrics

### Enterprise Validation

For enterprise deployments:

1. **Security Scan**: Run security validation
2. **Performance Test**: Load testing with realistic data
3. **Integration Test**: Verify AI assistant connections
4. **User Acceptance**: Test with actual users
5. **Compliance Check**: Ensure regulatory compliance

## 🔄 Update Process

### Version Management

Follow semantic versioning:

- **Patch** (0.1.1): Bug fixes, minor improvements
- **Minor** (0.2.0): New features, backward compatible
- **Major** (1.0.0): Breaking changes

### Update Workflow

```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Update CHANGELOG.md
# Add new version section with changes

# 3. Validate and build
npm run build

# 4. Test thoroughly
npm run demo
npm run test

# 5. Package and publish
npm run package
npm run publish

# 6. Create GitHub release
git tag v0.1.1
git push origin v0.1.1
```

## 🛡️ Security Considerations

### Pre-Publication Security

- [ ] No hardcoded secrets or credentials
- [ ] Sensitive data properly sanitized in logs
- [ ] Dependencies scanned for vulnerabilities
- [ ] Code reviewed for security issues
- [ ] Audit logging properly configured

### Marketplace Security

- [ ] Publisher account secured with 2FA
- [ ] Personal access tokens properly managed
- [ ] Extension permissions minimized
- [ ] Privacy policy included if collecting data

## 📈 Monitoring and Analytics

### Marketplace Analytics

Monitor these metrics:

- **Downloads**: Total and daily downloads
- **Ratings**: User ratings and reviews
- **Usage**: Active users and feature usage
- **Issues**: Bug reports and feature requests

### Enterprise Analytics

For enterprise deployments:

- **Adoption**: User adoption rates
- **Performance**: Response times and errors
- **Usage Patterns**: Most used features
- **Feedback**: User satisfaction surveys

## 🆘 Troubleshooting Deployment

### Common Issues

**Package creation fails:**

```bash
# Check for missing files
npm run validate:deployment

# Verify .vscodeignore excludes properly
vsce ls
```

**Marketplace publication fails:**

```bash
# Check publisher permissions
vsce verify-pat <token>

# Validate package
vsce package --allow-star-activation
```

**Extension doesn't activate:**

```bash
# Check activation events
# Verify main entry point
# Test in clean VSCode instance
```

### Debug Mode

Enable debug logging for troubleshooting:

```json
{
  "enterpriseAiContext.debug.enabled": true,
  "enterpriseAiContext.debug.logLevel": "verbose"
}
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests pass
- [ ] Code quality checks pass
- [ ] Documentation is complete
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Security review completed

### Packaging

- [ ] Clean build successful
- [ ] Package created without errors
- [ ] Package size reasonable (<10MB)
- [ ] All required files included
- [ ] Unnecessary files excluded

### Testing

- [ ] Local installation works
- [ ] All features functional
- [ ] Performance acceptable
- [ ] Error handling works
- [ ] Demo scenarios work

### Publication

- [ ] Publisher account ready
- [ ] Marketplace listing complete
- [ ] Screenshots and documentation ready
- [ ] Publication successful
- [ ] Extension appears in marketplace

### Post-Deployment

- [ ] Installation from marketplace works
- [ ] User feedback monitored
- [ ] Analytics configured
- [ ] Support channels ready
- [ ] Update process documented

---

**Ready to deploy?** Run `npm run validate:deployment` to ensure everything is ready!
