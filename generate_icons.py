#!/usr/bin/env python3
"""
Generate PNG icons from SVG for the Edge extension.

Requirements:
  pip install Pillow cairosvg
  OR
  pip install svglib
"""

import os
import sys
from pathlib import Path

def generate_icons_with_cairosvg():
    """Generate PNG icons using cairosvg."""
    try:
        import cairosvg
    except ImportError:
        print("❌ cairosvg not found. Install with: pip install cairosvg")
        return False
    
    svg_path = Path(__file__).parent / "icons" / "icon.svg"
    if not svg_path.exists():
        print(f"❌ SVG file not found: {svg_path}")
        return False
    
    sizes = [16, 48, 128]
    icons_dir = svg_path.parent
    
    for size in sizes:
        output_path = icons_dir / f"icon-{size}.png"
        try:
            cairosvg.svg2png(
                url=str(svg_path),
                write_to=str(output_path),
                output_width=size,
                output_height=size
            )
            print(f"✓ Generated {output_path.name}")
        except Exception as e:
            print(f"❌ Failed to generate icon-{size}.png: {e}")
            return False
    
    return True

def generate_icons_with_svglib():
    """Generate PNG icons using svglib and Pillow."""
    try:
        from svglib.svglib import svg2rlg
        from reportlab.graphics import renderPM
    except ImportError:
        print("❌ svglib or reportlab not found. Install with: pip install svglib reportlab")
        return False
    
    svg_path = Path(__file__).parent / "icons" / "icon.svg"
    if not svg_path.exists():
        print(f"❌ SVG file not found: {svg_path}")
        return False
    
    sizes = [16, 48, 128]
    icons_dir = svg_path.parent
    
    for size in sizes:
        output_path = icons_dir / f"icon-{size}.png"
        try:
            drawing = svg2rlg(str(svg_path))
            if drawing:
                drawing.width = size
                drawing.height = size
                renderPM.drawToFile(drawing, str(output_path), fmt="PNG")
                print(f"✓ Generated {output_path.name}")
            else:
                print(f"❌ Failed to parse SVG")
                return False
        except Exception as e:
            print(f"❌ Failed to generate icon-{size}.png: {e}")
            return False
    
    return True

def main():
    print("🎨 Generating PNG icons from SVG...")
    print()
    
    # Try cairosvg first (better quality)
    print("Attempting to use cairosvg (recommended)...")
    if generate_icons_with_cairosvg():
        print()
        print("✅ Icons generated successfully!")
        print("📁 Icons are ready in icons/ folder")
        return 0
    
    print()
    print("Attempting to use svglib + reportlab...")
    if generate_icons_with_svglib():
        print()
        print("✅ Icons generated successfully!")
        print("📁 Icons are ready in icons/ folder")
        return 0
    
    print()
    print("❌ Icon generation failed!")
    print()
    print("📋 Installation options:")
    print()
    print("Option 1 (Recommended - cairosvg):")
    print("  pip install cairosvg")
    print()
    print("Option 2 (Alternative - svglib):")
    print("  pip install svglib reportlab")
    print()
    print("Option 3 (Online - No installation):")
    print("  1. Visit: https://cloudconvert.com/svg-to-png")
    print("  2. Upload icons/icon.svg")
    print("  3. Convert to PNG at 16x16, 48x48, 128x128 sizes")
    print("  4. Save as icon-16.png, icon-48.png, icon-128.png")
    print()
    
    return 1

if __name__ == "__main__":
    sys.exit(main())