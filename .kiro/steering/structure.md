# Project Structure

## Current State
The project is currently in its initial setup phase with only the `.kiro` configuration directory present.

## Recommended Structure
Based on the YouTube Creator Manager product goals, here's a suggested project organization:

```
/
├── .kiro/                    # Kiro AI assistant configuration
│   └── steering/            # AI guidance documents
├── src/                     # Source code
│   ├── components/          # Reusable UI components
│   ├── pages/              # Application pages/views
│   ├── services/           # API services and business logic
│   ├── utils/              # Utility functions
│   └── types/              # Type definitions (if using TypeScript)
├── public/                 # Static assets
├── tests/                  # Test files
├── docs/                   # Documentation
├── config/                 # Configuration files
└── scripts/                # Build and deployment scripts
```

## Folder Guidelines

### `/src/services/`
- YouTube API integration
- Authentication handling
- Data processing and analytics
- Scheduling services

### `/src/components/`
- Reusable UI components
- Follow component naming conventions (PascalCase)
- Include component-specific styles

### `/src/pages/`
- Main application views
- Dashboard, analytics, video management, etc.

### `/config/`
- Environment-specific configurations
- API endpoint configurations
- Feature flags

## File Naming Conventions
- Use kebab-case for file names: `video-manager.js`
- Use PascalCase for component files: `VideoCard.jsx`
- Use UPPER_CASE for constants: `API_ENDPOINTS.js`
- Prefix test files with the component name: `VideoCard.test.js`

## Code Organization Principles
- Keep related functionality together
- Separate concerns (UI, business logic, data)
- Use clear, descriptive names
- Maintain consistent file structure across features