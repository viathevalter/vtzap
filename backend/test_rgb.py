import ctypes
import time
from collections import Counter

def scan_vertical_line(x_pos, start_y, length=300, step=3):
    hdc = ctypes.windll.user32.GetWindowDC(0)
    colors = []
    try:
        for dy in range(0, length, step):
            y = int(start_y + dy)
            if x_pos > 0 and y > 0:
                color = ctypes.windll.gdi32.GetPixel(hdc, x_pos, y)
                r = color & 0xFF
                g = (color >> 8) & 0xFF
                b = (color >> 16) & 0xFF
                colors.append((r, g, b))
    finally:
        ctypes.windll.user32.ReleaseDC(0, hdc)
    return colors

print("--- DEBUGGING CTYPES RGB EXTRACTION ---")
print("Target: X=142, Start Y=300, Length=300")
print("Espera de 3 segundos para você focar a tela do WhatsApp com algum contato nela...")
time.sleep(3)

colors = scan_vertical_line(142, 300, 300, 3)

content_pixels = []
background_pixels = []

for idx, (r, g, b) in enumerate(colors):
    y_pos = 300 + (idx * 3)
    # Copiando exatamente o IF do robô
    if not ( (r<45 and g<45 and b<45) or (r>230 and g>230 and b>230) or (abs(r-g)<15 and abs(g-b)<15 and r>180) ):
        content_pixels.append(f"Y:{y_pos} -> RGB({r},{g},{b})")
    else:
        background_pixels.append(f"Y:{y_pos} -> RGB({r},{g},{b})")

print(f"\nResumo da Captura (Total de {len(colors)} amostras):")
print(f"Detectou como Fundo (Branco/Cinza): {len(background_pixels)}")
print(f"Detectou como CONTEÚDO (Foto/Letra): {len(content_pixels)}")

if content_pixels:
    print("\nAMOSTRAS CLASSIFICADAS COMO CONTEÚDO:")
    for p in content_pixels: print(p)
else:
    print("\nNENHUM PIXEL DE CONTEÚDO FOI ENCONTRADO! O robô acha que a linha vertical inteira é tela branca/cinza.")
    print("Amostra dos 10 primeiros pixels que ele leu:")
    for p in background_pixels[:10]: print(p)

print("\nDUMPLING TUDO:")
print(f"Cores mais frequentes: {Counter(colors).most_common(10)}")
