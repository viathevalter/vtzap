import ctypes
import time
from collections import Counter

def capture_grid(center_x, center_y, width=250, height=50, step=8):
    hdc = ctypes.windll.user32.GetWindowDC(0)
    pixels = []
    try:
        for dx in range(-int(width/2), int(width/2), step):
            for dy in range(-int(height/2), int(height/2), step):
                x, y = int(center_x + dx), int(center_y + dy)
                if x > 0 and y > 0:
                    color = ctypes.windll.gdi32.GetPixel(hdc, x, y)
                    r = color & 0xFF
                    g = (color >> 8) & 0xFF
                    b = (color >> 16) & 0xFF
                    pixels.append((r, g, b))
    finally:
        ctypes.windll.user32.ReleaseDC(0, hdc)
    return pixels

print("Scanning X: 253, Y: 477...")
pixels = capture_grid(253, 477)
print(f"Total Pixels: {len(pixels)}")
print("Top 10 Colors:", Counter(pixels).most_common(10))

# Try screen dimensions just to be safe
print("\nScanning X: 500, Y: 500...")
pixels_mid = capture_grid(500, 500)
print("Top 10 Colors Mid:", Counter(pixels_mid).most_common(10))
