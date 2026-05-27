#!/usr/bin/env python3
"""生成游戏占位精灵图片 — 简约纯色 PNG"""
import struct, zlib, os, sys

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sprites')


def make_chunk(chunk_type, data):
    chunk = chunk_type + data
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)


def create_png(width, height, r, g, b, a=255, shape='circle'):
    """创建简约图形 PNG"""
    sig = b'\x89PNG\r\n\x1a\n'
    has_alpha = a < 255 or shape in ('circle', 'diamond')

    if has_alpha:
        color_type = 6  # RGBA
        bpp = 4
    else:
        color_type = 2  # RGB
        bpp = 3

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, color_type, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    raw = b''
    cx, cy = width / 2, height / 2
    radius = min(width, height) / 2 - 2

    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            px_r, px_g, px_b, px_a = r, g, b, a

            if shape == 'circle':
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if dist > radius:
                    px_a = 0
                elif dist > radius - 2:
                    edge_fade = max(0, min(1, radius - dist + 0.5))
                    px_a = int(a * edge_fade)
            elif shape == 'diamond':
                dx, dy = abs(x - cx), abs(y - cy)
                if dx / (width / 2) + dy / (height / 2) > 1:
                    px_a = 0

            if has_alpha:
                raw += struct.pack('BBBB', px_r, px_g, px_b, px_a)
            else:
                raw += struct.pack('BBB', px_r, px_g, px_b)

    idat = make_chunk(b'IDAT', zlib.compress(raw))
    iend = make_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend


def main():
    sprites_dir = os.path.abspath(OUT_DIR)
    os.makedirs(sprites_dir, exist_ok=True)

    sprites = [
        # (filename, size, r, g, b, a, shape)
        ('player.png',      48, 74,  158, 255, 255, 'circle'),
        ('zombie.png',     40, 204, 51,  51,  255, 'circle'),
        ('zombie_elite.png', 46, 255, 102, 0,   255, 'circle'),
        ('survivor.png',   40, 51,  204, 102, 255, 'circle'),
        ('supply_food.png', 32, 255, 200, 50,  255, 'diamond'),
        ('supply_water.png', 32, 50,  180, 255, 255, 'diamond'),
        ('supply_ammo.png', 32, 200, 150, 50,  255, 'diamond'),
        ('supply_parts.png', 32, 150, 150, 150, 255, 'diamond'),
        ('supply_material.png', 32, 139, 90,  43, 255, 'diamond'),
        ('wall.png',       64, 30,  30,  50,  255, 'rect'),
        ('floor.png',      64, 28,  28,  42,  255, 'rect'),
    ]

    for item in sprites:
        filename, size, r, g, b, a, shape = item
        path = os.path.join(sprites_dir, filename)
        data = create_png(size, size, r, g, b, a, shape)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  Created: {path} ({size}x{size})')

    print(f'\nDone. {len(sprites)} sprites generated in {sprites_dir}')


if __name__ == '__main__':
    main()
