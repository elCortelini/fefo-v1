from PIL import Image, ImageOps, ImageDraw, ImageFont
from pathlib import Path

files = [
    Path(r'D:\GitHub\fefo v1\images\fefo_mapa_mental_projeto.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_modelo_3d_chassi1.png'),
    Path(r'D:\GitHub\fefo v1\images\fefo_modelo_3d_chassi2.png'),
    Path(r'D:\GitHub\fefo v1\images\fefo_hardware_interno_esp32.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_motor_vibracao_hardware.jpeg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_prototipo_bancada.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_prototipo_fisico_completo.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_prototipo_acendido.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_prototipo_em_uso.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_prototipo_campo_escola.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_app.jpg'),
    Path(r'D:\GitHub\fefo v1\images\fefo_alto_falantes_hardware.jpg'),
]

out = Path(r'D:\Downloads\FEFO\contact_sheet_selected.jpg')
thumb_w, thumb_h = 360, 260
label_h = 42
cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * thumb_w, rows * (thumb_h + label_h)), 'white')
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for i, path in enumerate(files):
    x = (i % cols) * thumb_w
    y = (i // cols) * (thumb_h + label_h)
    if path.exists():
        img = Image.open(path).convert('RGB')
        img = ImageOps.contain(img, (thumb_w - 20, thumb_h - 20))
        px = x + (thumb_w - img.width) // 2
        py = y + (thumb_h - img.height) // 2
        sheet.paste(img, (px, py))
    label = f'{i+1}. {path.stem}'
    draw.text((x + 8, y + thumb_h + 7), label[:54], fill='black', font=font)

sheet.save(out, quality=90)
print(out)
