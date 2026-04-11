import { Resvg } from '@resvg/resvg-js'

/**
 * Renders an SVG string to a PNG Buffer at 1200×630 pixels.
 * The SVG must use hardcoded colors (OG mode) — CSS variables won't work here.
 * @param {string} svgString - SVG markup string (OG mode, self-contained colors)
 * @returns {Promise<Buffer>} PNG image data
 */
export async function renderMindmapPNG(svgString) {
  if (typeof svgString !== 'string' || svgString.trim() === '') {
    throw new Error('renderMindmapPNG: svgString must be a non-empty string')
  }

  let resvg
  try {
    resvg = new Resvg(svgString, {
      fitTo: { mode: 'width', value: 1200 },
      font: {
        loadSystemFonts: true,
      },
    })
  } catch (error) {
    throw new Error(`renderMindmapPNG: failed to initialize renderer: ${error?.message || error}`)
  }

  let rendered
  try {
    rendered = resvg.render()
  } catch (error) {
    throw new Error(`renderMindmapPNG: render failed: ${error?.message || error}`)
  }

  const width = rendered.width
  const height = rendered.height
  if (width !== 1200 || height !== 630) {
    throw new Error(`renderMindmapPNG: expected 1200×630 but got ${width}×${height}`)
  }

  try {
    return Buffer.from(rendered.asPng())
  } catch (error) {
    throw new Error(`renderMindmapPNG: failed to encode PNG: ${error?.message || error}`)
  }
}
