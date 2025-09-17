# Git Convention

## Core Principles

### 1. Single Responsibility Commits
- Each commit addresses one specific change or feature
- Separate unrelated changes into distinct commits
- Maintain logical boundaries between functional areas

### 2. Controlled Change Management
- Review file changes before staging
- Analyze modifications by functional scope
- Stage changes that belong to the same logical unit
- Note: Interactive staging unavailable in Claude environment

## Commit Message Standards

### Type Classification
- **feat**: New feature implementation
- **fix**: Bug resolution
- **docs**: Documentation updates
- **style**: Code formatting (no logic changes)
- **refactor**: Code restructuring (no behavior changes)
- **test**: Test additions or modifications
- **chore**: Build system, dependencies, tooling
- **perf**: Performance optimization
- **remove**: Code or file deletion

### Message Format
```
<type>: <description>

<optional body>
```

## Commit Guidelines

1. **Subject line: 50 characters maximum**
2. **Capitalize first letter**
3. **No trailing punctuation**
4. **Body: 72 characters per line**
5. **Describe what was changed, not why**
6. **Reference issues in footer when applicable**

### Message Quality Standards
- Use factual, descriptive language
- Avoid subjective adjectives
- State changes objectively
- Eliminate marketing language

## Change Isolation Principles

### Granularity Standards
- Separate interface definitions from implementations
- Isolate business logic from UI integration
- Keep configuration changes separate from feature additions
- Maintain clear boundaries between functional layers

### Effective Commit Patterns

```bash
# Avoid: Multiple concerns in single commit
feat: Implement Route system with API and rendering

# Prefer: Focused, single-purpose commits
feat: Add RouteInfo interface
feat: Add RouteStore observable structure
feat: Add route data loading methods
feat: Add route selection state management
feat: Connect RouteStore to UI components
chore: Update configuration exports
```

### Professional Messaging

```bash
# Avoid: Subjective language
feat: Implement revolutionary unified navigation system

# Prefer: Objective description
feat: Create unified navigation panel

# Avoid: Marketing terminology
feat: Add highly optimized async rendering system

# Prefer: Technical accuracy
feat: Add async rendering for route selection
```

## Change Management Strategy

### Sequential Implementation
1. Define interfaces and types
2. Implement core functionality
3. Add integration layer
4. Update configuration and documentation

### Rollback Independence
- Each commit should be reversible without affecting other features
- Maintain system stability after individual commit rollback
- Test build integrity after hypothetical rollback scenarios

## Quality Assurance

### Commit Validation Criteria
- Rollback isolation: Can this commit be reverted independently?
- Build stability: Does the system remain functional after rollback?
- Functional independence: Do unrelated features continue operating?
- Single purpose: Does the commit address exactly one concern?
- Clear intent: Is the change evident from the commit message?

### Implementation Strategy

#### Interface-First Development
```bash
# Define contracts first
git commit -m "feat: Add Route interface definitions"

# Implement core logic
git commit -m "feat: Implement RouteStore data management"

# Add integration layer
git commit -m "feat: Connect RouteStore to UI components"
```

#### Graceful Degradation
```bash
# Functional with fallbacks
git commit -m "feat: Add RouteStore with mock data support"

# Production integration
git commit -m "feat: Replace mock data with API calls"
```

### Verification Process
1. Review change scope before committing
2. Verify single responsibility principle
3. Ensure rollback compatibility
4. Validate build integrity
5. Confirm functional independence

## Implementation Guidelines

### Professional Standards
- Use precise technical terminology
- Avoid subjective language
- State facts without embellishment
- Maintain consistency across messages
- Focus on technical accuracy over persuasion