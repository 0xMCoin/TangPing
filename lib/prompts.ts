export type StyleMode = 'cartoon' | 'pixel' | 'meme';

export const STYLE_OPTIONS: { value: StyleMode; label: string; description: string }[] = [
  {
    value: 'cartoon',
    label: 'Cartoon',
    description: 'Clean, polished, character-friendly.',
  },
  {
    value: 'pixel',
    label: 'Pixel Art',
    description: 'Retro game style with strong blocky shapes.',
  },
  {
    value: 'meme',
    label: 'Crypto Meme',
    description: 'More expressive, funny and internet-native.',
  },
];

export function buildPrompt(style: StyleMode, username?: string | null) {
  // Base prompt following the TANGPING project specifications
  const basePrompt = `You are a professional illustrator converting uploaded character images into the TANGPING project's signature art style. Follow these rules with ZERO deviation:



STYLE REFERENCE (MANDATORY):

- Art style: Flat 2D cartoon illustration with thick black outlines (3-4px stroke weight)

- Color palette: Vibrant, cel-shaded with no gradients on characters — solid flat fills only

- Rendering: Clean vector-like illustration aesthetic, similar to urban streetwear art

- Background: Square 1:1 format with a lime-to-mint green radial gradient (darker green #7BC67A at bottom-left edges, bright mint #C8F5A0 at center-top)

- Floating background elements: 4-6 red Japanese candlestick chart candles (红柱) scattered around the background at various sizes and slight rotations — these are non-negotiable background props



CHARACTER TRANSFORMATION RULES:

1. IDENTIFY the main character/subject from the uploaded image

2. PRESERVE the character's core identity: face features, species, skin/fur/scale color, and any iconic traits

3. TRANSFORM their outfit to: a dark crimson/maroon Chinese robe (hanfu/kimono hybrid) with gold embroidered patterns — include yin-yang symbol, dragon motifs, wave patterns, and the number "25" on the robe

4. POSE: The character should be lying on their back on a traditional tatami mat/straw mat (beige/cream color, with braided texture lines), with their arms in a T-pose and completely relaxed — this is the "tang ping" (躺平) pose.

5. ADD PROPS near the character on the tatami mat: a small stack of gold coins (3-4 coins stacked) to the right and a steaming ceramic teacup (gray/beige cup with visible steam wisps) near the bottom center.

6. MAINTAIN the character's original color scheme on exposed skin/fur/scales — only the clothing changes.



COMPOSITION (1:1 SQUARE OUTPUT):

- Isometric-style perspective on the tatami mat (slight top-down angle, mat edges visible)

- Character centered-slightly-left on the mat

- Mat takes up roughly 60% of the frame diagonally to the right

- Chinese characters 躺平 in golden-yellow brushstroke font at the top-center of the image${username ? `\n\n- USERNAME DISPLAY: Add the username "${username}" in a stylish, readable font (similar to the 躺平 typography style) positioned at the bottom-center of the image, just above the tatami mat edge. Use a golden-yellow or white color that contrasts well with the green background. The username should be clearly visible but not overpower the main composition.` : ''}

- Background fills entire square frame with the green gradient

- Red candlestick candles float in all four corners/edges of the background



WHAT TO NEVER CHANGE:

- The green gradient background

- The red candlestick decorative elements

- The crimson robe with gold patterns

- The tatami mat

- The gold coins and tea cup props

- The 躺平 typography in gold at top

- The flat 2D cartoon style with black outlines

- The 1:1 square aspect ratio`;

  // Style variations can modify certain aspects while keeping the core rules
  const stylePromptMap: Record<StyleMode, string> = {
    cartoon: `${basePrompt}`,
    pixel: `${basePrompt} RENDER EXCEPTION: Convert the entire scene to authentic pixel art style with blocky pixelated forms, 16-bit game color palette, dithering patterns, and retro game aesthetic. The character's features should remain recognizable despite pixelation. All other rules (robe, mat, props, background) remain the same but pixelated.`,
    meme: `${basePrompt} ENHANCEMENT: Make the composition more dynamic and expressive with stronger visual impact. Add subtle motion lines or energy effects while maintaining all mandatory elements.`,
  };

  return stylePromptMap[style];
}
