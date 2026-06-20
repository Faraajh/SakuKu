import os
from PIL import Image

def generate_icons():
    logo_path = 'logo.png'
    output_dir = 'public/icons'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")
        
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found.")
        return
        
    try:
        with Image.open(logo_path) as img:
            for size in sizes:
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
                output_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
                resized_img.save(output_path, "PNG")
                print(f"Generated: {output_path}")
        print("All icons generated successfully!")
    except Exception as e:
        print(f"Error generating icons: {e}")

if __name__ == "__main__":
    generate_icons()
