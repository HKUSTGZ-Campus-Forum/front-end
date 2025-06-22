import { computed } from 'vue'
import { useThemeStore } from '~/store/themeStore'

/**
 * Composable for accessing theme functionality in components
 */
export const useTheme = () => {
  const themeStore = useThemeStore()

  // Computed properties for easy access to theme state
  const currentTheme = computed(() => themeStore.activeTheme)
  const themeId = computed(() => themeStore.currentTheme)
  const isLegacyTheme = computed(() => themeStore.isLegacyTheme)
  const themeVariables = computed(() => themeStore.themeVariables)

  // Helper methods
  const setTheme = (themeId: string) => {
    themeStore.setTheme(themeId)
  }

  const isDarkTheme = computed(() => {
    return currentTheme.value?.category === 'dark'
  })

  const isLightTheme = computed(() => {
    return currentTheme.value?.category === 'light'
  })

  const isColoredTheme = computed(() => {
    return currentTheme.value?.category === 'colored'
  })

  // Get theme-aware component classes
  const getThemeClasses = (componentType?: 'card' | 'button' | 'input' | 'modal') => {
    const baseClasses = [`theme-${themeId.value}`]
    
    if (componentType) {
      baseClasses.push(`${componentType}-themed`)
    }
    
    if (isDarkTheme.value) {
      baseClasses.push('dark-theme')
    } else if (isLightTheme.value) {
      baseClasses.push('light-theme')
    } else {
      baseClasses.push('colored-theme')
    }
    
    return baseClasses
  }

  // Generate inline styles for theme variables
  const getThemeStyles = () => {
    return themeVariables.value
  }

  // Get theme-aware colors for specific use cases
  const getThemeColors = () => {
    if (!currentTheme.value) return {}
    
    return {
      primary: currentTheme.value.colors.interactive.primary,
      secondary: currentTheme.value.colors.interactive.secondary,
      background: currentTheme.value.background.primary,
      surface: currentTheme.value.colors.surface.primary,
      text: currentTheme.value.colors.text.primary,
      textSecondary: currentTheme.value.colors.text.secondary,
      border: currentTheme.value.colors.border.primary,
      success: currentTheme.value.colors.semantic.success,
      warning: currentTheme.value.colors.semantic.warning,
      error: currentTheme.value.colors.semantic.error,
      info: currentTheme.value.colors.semantic.info
    }
  }

  // Apply theme to specific element
  const applyThemeToElement = (element: HTMLElement) => {
    if (!element || !currentTheme.value) return
    
    const variables = generateCSSVariables(currentTheme.value)
    Object.entries(variables).forEach(([property, value]) => {
      element.style.setProperty(property, value)
    })
  }

  // CSS-in-JS helper for dynamic styling
  const createThemeStyles = (styles: Record<string, any>) => {
    const colors = getThemeColors()
    
    // Replace theme color tokens with actual values
    const processedStyles = { ...styles }
    
    Object.keys(processedStyles).forEach(key => {
      let value = processedStyles[key]
      
      if (typeof value === 'string') {
        value = value
          .replace(/\$primary/g, colors.primary)
          .replace(/\$secondary/g, colors.secondary)
          .replace(/\$background/g, colors.background)
          .replace(/\$surface/g, colors.surface)
          .replace(/\$text/g, colors.text)
          .replace(/\$textSecondary/g, colors.textSecondary)
          .replace(/\$border/g, colors.border)
          .replace(/\$success/g, colors.success)
          .replace(/\$warning/g, colors.warning)
          .replace(/\$error/g, colors.error)
          .replace(/\$info/g, colors.info)
        
        processedStyles[key] = value
      }
    })
    
    return processedStyles
  }

  // Accessibility helpers
  const getContrastColor = (backgroundColor: string) => {
    // Simple contrast calculation - in production, use a proper color library
    const rgb = backgroundColor.match(/\d+/g)
    if (!rgb) return currentTheme.value?.colors.text.primary || '#000000'
    
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000
    return brightness > 128 
      ? currentTheme.value?.colors.text.primary || '#000000'
      : currentTheme.value?.colors.text.inverse || '#ffffff'
  }

  // Theme transition helpers
  const enableThemeTransitions = () => {
    if (process.client) {
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'
    }
  }

  const disableThemeTransitions = () => {
    if (process.client) {
      document.body.style.transition = ''
    }
  }

  return {
    // State
    currentTheme,
    themeId,
    isLegacyTheme,
    themeVariables,
    
    // Computed flags
    isDarkTheme,
    isLightTheme,
    isColoredTheme,
    
    // Methods
    setTheme,
    getThemeClasses,
    getThemeStyles,
    getThemeColors,
    applyThemeToElement,
    createThemeStyles,
    getContrastColor,
    enableThemeTransitions,
    disableThemeTransitions
  }
}