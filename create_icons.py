#!/usr/bin/env python3
"""
Script pour générer les icônes de l'extension Chrome
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Crée une icône avec un dégradé et un symbole"""
    # Créer une image avec fond dégradé
    image = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(image)
    
    # Dégradé violet/bleu
    for y in range(size):
        ratio = y / size
        r = int(102 + (118 - 102) * ratio)
        g = int(126 + (75 - 126) * ratio)
        b = int(234 + (162 - 234) * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    
    # Ajouter un cercle blanc au centre
    margin = size // 4
    draw.ellipse([margin, margin, size - margin, size - margin], 
                 fill=None, outline='white', width=max(2, size // 16))
    
    # Ajouter le symbole de graduation (chapeau)
    center_x = size // 2
    center_y = size // 2
    
    # Triangle du chapeau
    hat_size = size // 3
    points = [
        (center_x, center_y - hat_size // 2),
        (center_x - hat_size, center_y + hat_size // 4),
        (center_x + hat_size, center_y + hat_size // 4)
    ]
    draw.polygon(points, fill='white')
    
    # Ligne horizontale du chapeau
    draw.line([
        (center_x - hat_size - 5, center_y + hat_size // 4),
        (center_x + hat_size + 5, center_y + hat_size // 4)
    ], fill='white', width=max(2, size // 20))
    
    # Sauvegarder
    image.save(filename, 'PNG')
    print(f"✓ Icône créée: {filename}")

def main():
    # Dossier de l'extension
    extension_dir = '.'
    
    # Créer les 3 icônes
    create_icon(16, os.path.join(extension_dir, 'icon16.png'))
    create_icon(48, os.path.join(extension_dir, 'icon48.png'))
    create_icon(128, os.path.join(extension_dir, 'icon128.png'))
    
    print("\n✅ Toutes les icônes ont été créées!")
    print("Vous pouvez maintenant recharger l'extension dans Chrome.")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("❌ Pillow n'est pas installé.")
        print("Installation: pip install Pillow")
        exit(1)
