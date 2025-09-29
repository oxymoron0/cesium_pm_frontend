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

## Claude Code Integration Protocol

### Change Analysis Workflow

#### 1. File Classification Process
```bash
# Execute systematic analysis
git status
git diff --name-only

# Categorize by functional area:
# - Utils/Core Logic (interfaces, business logic)
# - Components (UI implementation)
# - Integration (component connections)
# - Documentation (technical specs)
# - Configuration (build, environment)
```

#### 2. Logical Grouping Strategy
**Group files by:**
- **Dependency hierarchy**: Foundation → Implementation → Integration
- **Functional cohesion**: Related changes that solve single problem
- **Impact scope**: Core changes separate from usage changes
- **Rollback boundaries**: Each group must be independently reversible

#### 3. Commit Sequencing Rules
**Mandatory order:**
1. **Foundation**: Utilities, interfaces, core logic
2. **Implementation**: Components, services, business logic
3. **Integration**: Component connections, store bindings
4. **Usage**: UI integration, feature enablement
5. **Documentation**: Technical specifications, API docs
6. **Configuration**: Build updates, environment changes

### Commit Message Enhancement

#### Required Elements
```
<type>: <concise description>

<technical details>:
- Specific changes made (not why)
- Lines added/removed when significant
- Dependencies or breaking changes
- Performance implications if applicable

<integration notes>:
- Components affected
- API changes
- Rollback considerations
```

#### Quality Metrics
- **Line impact**: Mention significant additions/deletions
- **Component scope**: List affected components explicitly
- **Dependency changes**: Note new imports or utility usage
- **Performance effects**: State optimization or degradation

### File Processing Protocol

#### Pre-Commit Analysis
1. **Scope validation**: Ensure single responsibility per commit
2. **Dependency verification**: Check import/export consistency
3. **Integration impact**: Identify downstream effects
4. **Rollback testing**: Verify independent reversibility

#### Systematic Staging
```bash
# Process in dependency order
git add <utilities_and_interfaces>
git commit -m "<foundation_commit>"

git add <core_components>
git commit -m "<implementation_commit>"

git add <integration_files>
git commit -m "<integration_commit>"
```

#### Unprocessed File Management
**Always document remaining changes:**
- List untracked files with purpose assessment
- Categorize modified files by relevance to current task
- Provide disposition recommendation (commit, ignore, separate task)
- State impact of leaving files uncommitted

### Quality Assurance Protocol

#### Commit Validation Checklist
- [ ] Single functional area addressed
- [ ] All related changes included (no partial implementations)
- [ ] Dependencies committed before dependents
- [ ] Message describes technical changes, not motivations
- [ ] Rollback independence verified
- [ ] Performance impact documented if applicable

#### Post-Commit Reporting
**Required summary format:**
```
Completed commits: X
- Foundation: <utils/interfaces>
- Implementation: <components/logic>
- Integration: <connections/bindings>
- Documentation: <specs/guides>

Remaining files: Y
- Modified: <file> - <reason_for_exclusion>
- Untracked: <file> - <purpose_assessment>
```

### Technical Documentation Standards

#### Commit Body Requirements
- **Quantify changes**: "Remove 47 lines of duplicate logic"
- **Specify scope**: "Affects PM10/PM25/VOCs sensor components"
- **Note patterns**: "Implements 3-layer positioning architecture"
- **State dependencies**: "Requires airQuality utility integration"

#### Integration Documentation
- List component interfaces changed
- Document new utility function usage
- Specify performance optimization techniques
- Note architectural pattern implementations