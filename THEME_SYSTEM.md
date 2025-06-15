# Theme System Documentation

## Overview
The UniKorn Campus Forum uses a comprehensive theme system with 6 predefined themes that provide consistent styling across the entire application. This system replaces the previous background customization with a more systematic approach.

## Available Themes

### 1. Light Theme (简洁白)
- **ID**: `light`
- **Description**: Clean and minimalist light theme for daily use
- **Primary Colors**: White backgrounds, blue accents
- **Best For**: Daytime usage, reading-heavy tasks

### 2. Dark Theme (深邃黑)
- **ID**: `dark`
- **Description**: Professional dark theme to reduce eye strain
- **Primary Colors**: Dark backgrounds, blue accents
- **Best For**: Night usage, coding, extended reading

### 3. Cafe Theme (温馨咖)
- **ID**: `cafe`
- **Description**: Warm brown tones creating a cozy atmosphere
- **Primary Colors**: Brown/amber backgrounds, warm accents
- **Best For**: Casual browsing, relaxed environment

### 4. Pro-Tech Theme (科技蓝)
- **ID**: `pro-tech`
- **Description**: Modern tech-inspired theme with blue gradients
- **Primary Colors**: Blue gradients, tech-style accents
- **Best For**: Professional use, tech discussions

### 5. Ocean Theme (海洋蓝)
- **ID**: `ocean`
- **Description**: Calming blue theme inspired by ocean depths
- **Primary Colors**: Deep blue backgrounds, cyan accents
- **Best For**: Focus work, calming environment

### 6. Sunset Theme (温暖橙)
- **ID**: `sunset`
- **Description**: Energetic orange theme with warm vibes
- **Primary Colors**: Orange/coral backgrounds, warm accents
- **Best For**: Creative work, energetic atmosphere

## Theme System Architecture

### Core Files
```
/types/theme.ts              # TypeScript interfaces
/utils/themes.ts             # Theme configurations
/store/themeStore.ts         # Pinia state management
/components/setting/ThemeSettings.vue  # Theme selection UI
/plugins/theme.client.ts     # Theme initialization
```

### CSS Variable System
Each theme generates CSS custom properties that components use for styling:

```css
/* Text Colors */
--text-primary      /* Main text - adapts to background */
--text-secondary    /* Secondary text - slightly muted */
--text-muted        /* Muted text - for less important content */
--text-inverse      /* ❌ AVOID - opposite of background (poor contrast) */

/* Background Colors */
--bg-primary        /* Main page background */
--bg-secondary      /* Secondary backgrounds */
--surface-primary   /* Card/component surfaces */
--surface-secondary /* Elevated surfaces */
--surface-elevated  /* Highest elevation surfaces */
--surface-overlay   /* Overlay/modal backgrounds */

/* Interactive Elements */
--interactive-primary    /* Primary buttons, links */
--interactive-secondary  /* Secondary interactive elements */
--interactive-hover      /* Hover states */

/* Borders & Shadows */
--border-primary    /* Main borders */
--border-secondary  /* Secondary borders */
--border-focus      /* Focus states */
--shadow-small      /* Subtle shadows */
--shadow-medium     /* Standard shadows */
--shadow-large      /* Prominent shadows */

/* Semantic Colors */
--semantic-success  /* Success states (green) */
--semantic-warning  /* Warning states (yellow) */
--semantic-error    /* Error states (red) */
--semantic-info     /* Info states (blue) */
```

## Critical Development Rules

### ✅ DO - Best Practices

#### 1. Always Use Theme Variables
```scss
// ✅ CORRECT - Uses theme variables
.my-component {
  background: var(--surface-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-small);
}
```

#### 2. Use Correct Text Color Variables
```scss
// ✅ CORRECT - Adaptive text colors
.title {
  color: var(--text-primary);     // Main readable text
}
.subtitle {
  color: var(--text-secondary);   // Slightly muted
}
.caption {
  color: var(--text-muted);       // Very subtle text
}
```

#### 3. Layer Backgrounds Properly
```scss
// ✅ CORRECT - Proper layering
.page {
  background: var(--bg-primary);           // Base layer
}
.card {
  background: var(--surface-primary);      // Card layer
}
.modal {
  background: var(--surface-elevated);     // Elevated layer
}
```

### ❌ DON'T - Common Mistakes

#### 1. Never Use Hardcoded Colors
```scss
// ❌ WRONG - Hardcoded colors break themes
.bad-component {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cccccc;
}
```

#### 2. Don't Use --text-inverse for Regular Text
```scss
// ❌ WRONG - Creates poor contrast
.bad-text {
  color: var(--text-inverse);  // White on white, black on black!
}

// ✅ CORRECT - Use primary for readable text
.good-text {
  color: var(--text-primary);  // Always readable
}
```

#### 3. Don't Mix Theme and Hardcoded Styles
```scss
// ❌ WRONG - Inconsistent styling
.mixed-component {
  background: var(--surface-primary);  // Theme variable
  color: #333333;                      // Hardcoded color
}
```

## Component Development Guidelines

### New Component Checklist
When creating a new component, ensure:

- [ ] All colors use CSS custom properties (--variable-name)
- [ ] Text uses `--text-primary`, `--text-secondary`, or `--text-muted`
- [ ] Backgrounds use appropriate surface variables
- [ ] Interactive elements use `--interactive-*` variables
- [ ] Borders use `--border-*` variables
- [ ] Shadows use `--shadow-*` variables
- [ ] Test component in all 6 themes
- [ ] Verify text contrast in light and dark themes

### Theme-Safe Color Patterns

#### Cards and Containers
```scss
.card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-small);
  
  .card-header {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-secondary);
  }
  
  .card-content {
    color: var(--text-primary);
    
    .card-subtitle {
      color: var(--text-secondary);
    }
  }
}
```

#### Buttons and Interactive Elements
```scss
.btn {
  // Primary button
  &.btn-primary {
    background: var(--interactive-primary);
    color: var(--text-inverse);  // OK for buttons - ensures contrast
    border: 1px solid var(--interactive-primary);
    
    &:hover {
      background: var(--interactive-hover);
    }
  }
  
  // Secondary button
  &.btn-secondary {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    
    &:hover {
      background: var(--interactive-secondary);
    }
  }
}
```

#### Form Elements
```scss
.form-input {
  background: var(--surface-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  
  &:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: var(--text-muted);
  }
}
```

## Testing Your Components

### Manual Testing Checklist
Test your component in each theme:

1. **Light Theme**: Verify dark text on light backgrounds
2. **Dark Theme**: Verify light text on dark backgrounds  
3. **Cafe Theme**: Check warm brown color adaptation
4. **Pro-Tech Theme**: Ensure blue accent integration
5. **Ocean Theme**: Verify blue theme compatibility
6. **Sunset Theme**: Check orange theme harmony

### Automated Testing
```typescript
// Example theme testing in component tests
describe('MyComponent', () => {
  const themes = ['light', 'dark', 'cafe', 'pro-tech', 'ocean', 'sunset'];
  
  themes.forEach(theme => {
    it(`renders correctly in ${theme} theme`, () => {
      // Set theme and test component rendering
    });
  });
});
```

## Migration Guide

### Converting Existing Components

#### Step 1: Identify Hardcoded Colors
```scss
// Find patterns like:
background: #ffffff;
color: #000000;
border: 1px solid #cccccc;
```

#### Step 2: Replace with Theme Variables
```scss
// Replace with:
background: var(--surface-primary);
color: var(--text-primary);
border: 1px solid var(--border-primary);
```

#### Step 3: Test Across Themes
- Switch between all 6 themes
- Verify readability and contrast
- Check for any broken layouts

### Common Conversion Patterns

| Old Hardcoded Style | New Theme Variable |
|-------------------|-------------------|
| `background: #ffffff` | `background: var(--surface-primary)` |
| `color: #000000` | `color: var(--text-primary)` |
| `color: #666666` | `color: var(--text-secondary)` |
| `border: 1px solid #ddd` | `border: 1px solid var(--border-primary)` |
| `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` | `box-shadow: var(--shadow-small)` |

## Advanced Features

### Custom Theme Creation
If you need to add a new theme:

1. Add theme configuration to `/utils/themes.ts`
2. Follow existing theme structure
3. Test all components with new theme
4. Update theme selection UI

### Dynamic Theme Switching
```typescript
// In your component
import { useThemeStore } from '~/store/themeStore'

const themeStore = useThemeStore()

// Switch theme
themeStore.setTheme('dark')

// Get current theme
const currentTheme = themeStore.activeTheme
```

### Theme-Aware Components
```vue
<template>
  <div class="component" :class="`theme-${currentTheme}`">
    <!-- Component content -->
  </div>
</template>

<script setup>
const themeStore = useThemeStore()
const currentTheme = computed(() => themeStore.currentTheme)
</script>
```

## Performance Considerations

### CSS Custom Properties
- CSS variables are recalculated when theme changes
- Avoid deep nesting of custom properties
- Use cached computed styles where possible

### Theme Switching
- Theme changes trigger CSS recalculation
- Minimize layout thrashing during transitions
- Consider using `will-change` for animated elements

## Troubleshooting

### Common Issues

#### Text Not Visible
**Problem**: Text appears to be missing or unreadable
**Solution**: Check if using `var(--text-inverse)` instead of `var(--text-primary)`

#### Colors Don't Change with Theme
**Problem**: Component colors remain static across themes
**Solution**: Replace hardcoded colors with CSS custom properties

#### Poor Contrast
**Problem**: Text is hard to read in certain themes
**Solution**: Use semantic color hierarchy (`--text-primary` → `--text-secondary` → `--text-muted`)

#### Layout Breaks in Specific Theme
**Problem**: Component layout fails in particular theme
**Solution**: Test background/border combinations, ensure sufficient contrast

### Debug Tools
```javascript
// Check current theme variables in DevTools console
const root = document.documentElement;
const styles = getComputedStyle(root);
console.log('Text Primary:', styles.getPropertyValue('--text-primary'));
console.log('Background:', styles.getPropertyValue('--bg-primary'));
```

## Future Enhancements

### Planned Features
- [ ] Auto dark mode based on system preferences
- [ ] Custom theme creator for advanced users
- [ ] Theme-based component variants
- [ ] Accessibility improvements (high contrast mode)
- [ ] Theme animation transitions

### Extension Points
- Add new semantic colors for specific use cases
- Create theme-specific component variants
- Implement theme inheritance for nested components

---

## Quick Reference

### Most Used Variables
```scss
/* Essential colors for 90% of components */
background: var(--surface-primary);
color: var(--text-primary);
border: 1px solid var(--border-primary);
box-shadow: var(--shadow-small);

/* Interactive elements */
background: var(--interactive-primary);
color: var(--text-inverse);  // Only for buttons/badges

/* Secondary text */
color: var(--text-secondary);

/* Muted/subtle text */
color: var(--text-muted);
```

### Remember
- **Always** use theme variables, never hardcoded colors
- **Test** in all 6 themes before committing
- **Use** `--text-primary` for readable text, avoid `--text-inverse`
- **Layer** backgrounds using surface variables
- **Follow** semantic color meaning (success = green, error = red)

---

*Last Updated: December 2024*  
*Version: 2.0*  
*Contributors: Claude Code AI Assistant*