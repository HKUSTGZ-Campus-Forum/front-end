🎨 Customization Location

File: /front-end/utils/themes.tsFunction: getLogoFilter() (lines 566-595)

🔧 How to Adjust Filters

Here's a guide to the CSS filter properties you can customize:

Available Filter Properties:

1. brightness(value) - Adjusts brightness (0 = black, 1 = normal, 2 =
   very bright)
2. contrast(value) - Adjusts contrast (0 = gray, 1 = normal, 2 = high
   contrast)
3. saturate(value) - Adjusts color saturation (0 = grayscale, 1 = normal,
   2 = vibrant)
4. hue-rotate(degrees) - Rotates colors (0deg = original, 180deg =
   opposite colors)
5. invert(value) - Inverts colors (0 = normal, 1 = fully inverted)
6. sepia(value) - Adds sepia tone (0 = normal, 1 = full sepia)
7. opacity(value) - Adjusts transparency (0 = invisible, 1 = normal)
8. blur(pixels) - Adds blur effect

Example Customizations:

case 'dark':
// Original: 'invert(1) brightness(0.9)'
// Make it brighter: 'invert(1) brightness(1.1)'
// Add some contrast: 'invert(1) brightness(0.9) contrast(1.2)'
return 'invert(1) brightness(1.1) contrast(1.2)';

case 'cafe':
// Original: 'sepia(1) saturate(1.2) hue-rotate(15deg) brightness(0.8)'
// Make it more brown: 'sepia(1) saturate(1.5) hue-rotate(20deg)
brightness(0.7)'
// Less sepia: 'sepia(0.8) saturate(1.2) hue-rotate(15deg)
brightness(0.8)'
return 'sepia(1) saturate(1.5) hue-rotate(20deg) brightness(0.7)';

Quick Adjustment Guide:

Want to make a specific theme's logo...

- Brighter? → Increase brightness() value
- Darker? → Decrease brightness() value
- More colorful? → Increase saturate() value
- Less colorful? → Decrease saturate() value
- Different color? → Adjust hue-rotate() degrees
- More contrast? → Add contrast(1.2) or higher

Color Hue Reference:

- 0deg = Original colors
- 60deg = Yellow tones
- 120deg = Green tones
- 180deg = Cyan tones
- 240deg = Blue tones
- 300deg = Purple tones
- 360deg = Back to original

Just modify the return values in the getLogoFilter() function and save -
the changes will apply immediately when you switch themes!