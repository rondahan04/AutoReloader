#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Chrome extension.
Requires PIL/Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow is required. Install it with: pip install Pillow")
    exit(1)

def create_icon(size, filename):
    """Create a simple icon with the specified size"""
    # Create a new image with a blue background
    img = Image.new('RGB', (size, size), color='#2196F3')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple refresh icon (circular arrow)
    margin = size // 4
    center = size // 2
    
    # Draw a circle
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 outline='white', width=max(2, size // 16))
    
    # Draw a simple arrow (refresh symbol)
    arrow_size = size // 3
    # Top arrow
    draw.line([center, margin + arrow_size, center - arrow_size//2, margin], 
              fill='white', width=max(2, size // 16))
    draw.line([center, margin + arrow_size, center + arrow_size//2, margin], 
              fill='white', width=max(2, size // 16))
    
    # Bottom arrow
    draw.line([center, size - margin - arrow_size, center - arrow_size//2, size - margin], 
              fill='white', width=max(2, size // 16))
    draw.line([center, size - margin - arrow_size, center + arrow_size//2, size - margin], 
              fill='white', width=max(2, size // 16))
    
    img.save(filename)
    print(f"Created {filename}")

if __name__ == "__main__":
    create_icon(16, "icon16.png")
    create_icon(48, "icon48.png")
    create_icon(128, "icon128.png")
    print("\nIcons created successfully!")


