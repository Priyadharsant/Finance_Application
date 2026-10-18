import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_rupee_icon():
    # Render at 1024x1024 supersampling
    S = 1024
    scale = S / 48.0
    
    # Create base image with transparency
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    
    # 1. Generate gradient background for squircle
    grad_img = Image.new("RGBA", (S, S))
    c1 = (5, 150, 105)   # #059669
    c2 = (16, 185, 129)  # #10b981
    c3 = (6, 182, 212)   # #06b6d4
    
    pixels = grad_img.load()
    for y in range(S):
        for x in range(S):
            # Diagonal gradient factor from 0.0 to 1.0
            t = (x + y) / (2.0 * S)
            if t < 0.45:
                sub_t = t / 0.45
                r = int(c1[0] + (c2[0] - c1[0]) * sub_t)
                g = int(c1[1] + (c2[1] - c1[1]) * sub_t)
                b = int(c1[2] + (c2[2] - c1[2]) * sub_t)
            else:
                sub_t = (t - 0.45) / 0.55
                r = int(c2[0] + (c3[0] - c2[0]) * sub_t)
                g = int(c2[1] + (c3[1] - c2[1]) * sub_t)
                b = int(c2[2] + (c3[2] - c2[2]) * sub_t)
            pixels[x, y] = (r, g, b, 255)
            
    # 2. Mask with rounded squircle
    mask = Image.new("L", (S, S), 0)
    mask_draw = ImageDraw.Draw(mask)
    margin = int(2.5 * scale)
    radius = int(12.0 * scale)
    mask_draw.rounded_rectangle(
        [margin, margin, S - margin, S - margin],
        radius=radius,
        fill=255
    )
    
    # Composite gradient with mask
    base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base.paste(grad_img, (0, 0), mask)
    
    # 3. Inner border glow
    border_draw = ImageDraw.Draw(base)
    inner_margin = int(3.0 * scale)
    inner_radius = int(11.5 * scale)
    border_draw.rounded_rectangle(
        [inner_margin, inner_margin, S - inner_margin, S - inner_margin],
        radius=inner_radius,
        outline=(255, 255, 255, 80),
        width=int(1.2 * scale)
    )
    
    # 4. Shadow layer for emblem
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    stroke_w = int(3.6 * scale)
    
    def draw_rupee(d, color):
        # Top bar
        x1, y1 = 14.5 * scale, 13.5 * scale
        x2, y2 = 31.0 * scale, 13.5 * scale
        d.line([(x1, y1), (x2, y2)], fill=color, width=stroke_w)
        d.ellipse([x1 - stroke_w/2, y1 - stroke_w/2, x1 + stroke_w/2, y1 + stroke_w/2], fill=color)
        d.ellipse([x2 - stroke_w/2, y2 - stroke_w/2, x2 + stroke_w/2, y2 + stroke_w/2], fill=color)

        # Mid bar
        x3, y3 = 14.5 * scale, 20.0 * scale
        x4, y4 = 25.5 * scale, 20.0 * scale
        d.line([(x3, y3), (x4, y4)], fill=color, width=stroke_w)
        d.ellipse([x3 - stroke_w/2, y3 - stroke_w/2, x3 + stroke_w/2, y3 + stroke_w/2], fill=color)
        d.ellipse([x4 - stroke_w/2, y4 - stroke_w/2, x4 + stroke_w/2, y4 + stroke_w/2], fill=color)

        # Spine straight part
        sx, sy1 = 20.0 * scale, 13.5 * scale
        sy2 = 20.5 * scale
        d.line([(sx, sy1), (sx, sy2)], fill=color, width=stroke_w)

        # Upper loop curve (approximated with fine segments)
        cx = 20.0 * scale
        cy = 24.25 * scale
        rx = 6.5 * scale
        ry = 3.75 * scale
        pts = []
        for angle_deg in range(-90, 91, 5):
            rad = math.radians(angle_deg)
            px = cx + rx * math.cos(rad)
            py = cy + ry * math.sin(rad)
            pts.append((px, py))
        # inward hook
        pts.append((17.0 * scale, 28.0 * scale))
        for i in range(len(pts) - 1):
            d.line([pts[i], pts[i+1]], fill=color, width=stroke_w)
            d.ellipse([pts[i][0] - stroke_w/2, pts[i][1] - stroke_w/2, pts[i][0] + stroke_w/2, pts[i][1] + stroke_w/2], fill=color)

        # Downward kick leg
        lx1, ly1 = 19.5 * scale, 28.0 * scale
        lx2, ly2 = 30.5 * scale, 38.5 * scale
        d.line([(lx1, ly1), (lx2, ly2)], fill=color, width=stroke_w)
        d.ellipse([lx1 - stroke_w/2, ly1 - stroke_w/2, lx1 + stroke_w/2, ly1 + stroke_w/2], fill=color)
        d.ellipse([lx2 - stroke_w/2, ly2 - stroke_w/2, lx2 + stroke_w/2, ly2 + stroke_w/2], fill=color)

    # Draw shadow first
    draw_rupee(shadow_draw, (2, 44, 34, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(1.5 * scale)))
    # Offset shadow down
    base.paste(shadow, (0, int(1.5 * scale)), shadow)

    # 5. Draw white emblem
    emblem = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    emblem_draw = ImageDraw.Draw(emblem)
    draw_rupee(emblem_draw, (255, 255, 255, 255))
    base.paste(emblem, (0, 0), emblem)

    # 6. Golden Prosperity Sparkle Accent
    sparkle = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sparkle)
    star_pts = [
        (34.0 * scale, 8.0 * scale),
        (35.0 * scale, 10.5 * scale),
        (37.5 * scale, 11.5 * scale),
        (35.0 * scale, 12.5 * scale),
        (34.0 * scale, 15.0 * scale),
        (33.0 * scale, 12.5 * scale),
        (30.5 * scale, 11.5 * scale),
        (33.0 * scale, 10.5 * scale),
    ]
    s_draw.polygon(star_pts, fill=(254, 240, 138, 255), outline=(245, 158, 11, 255))
    base.paste(sparkle, (0, 0), sparkle)

    # 7. Downscale with high quality Lanczos to 512x512
    final_512 = base.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save outputs
    frontend_dir = os.path.abspath("Frontend")
    electron_dir = os.path.join(frontend_dir, "electron")
    public_dir = os.path.join(frontend_dir, "public")
    build_dir = os.path.join(frontend_dir, "build")
    os.makedirs(build_dir, exist_ok=True)
    
    out_png_electron = os.path.join(electron_dir, "icon.png")
    out_ico_electron = os.path.join(electron_dir, "icon.ico")
    out_png_public = os.path.join(public_dir, "icon.png")
    out_ico_public = os.path.join(public_dir, "favicon.ico")
    out_ico_build = os.path.join(build_dir, "icon.ico")
    
    final_512.save(out_png_electron, format="PNG")
    final_512.save(out_png_public, format="PNG")
    
    # Generate multi-resolution ICO file
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    final_512.save(out_ico_electron, format="ICO", sizes=ico_sizes)
    final_512.save(out_ico_public, format="ICO", sizes=ico_sizes)
    final_512.save(out_ico_build, format="ICO", sizes=ico_sizes)
    
    print("[SUCCESS] Generated:")
    print(f" - {out_png_electron}")
    print(f" - {out_ico_electron} (sizes: {ico_sizes})")
    print(f" - {out_ico_build}")
    print(f" - {out_png_public}")
    print(f" - {out_ico_public}")

if __name__ == "__main__":
    create_rupee_icon()
