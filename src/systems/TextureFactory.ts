import Phaser from 'phaser';

const THEME_GROUND: Record<string, number> = {
  city: 0x3a3f33,
  highway: 0x3f5a3a,
  countryside: 0x4c8a3f,
  desert: 0xd9b06a,
  snow: 0xe8eef2
};

const THEME_ROAD: Record<string, number> = {
  city: 0x4a4a52,
  highway: 0x50504f,
  countryside: 0x5a5248,
  desert: 0xb08858,
  snow: 0x9aa3ad
};

export function themeGroundColor(theme: string): number {
  return THEME_GROUND[theme] ?? 0x3a5a34;
}

export function themeRoadColor(theme: string): number {
  return THEME_ROAD[theme] ?? 0x4a4a4a;
}

function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

export function generateCarTexture(scene: Phaser.Scene, key: string, bodyColor: number, accentColor: number): void {
  const w = 22;
  const h = 13;
  makeTexture(scene, key, w, h, (g) => {
    // shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(w / 2 + 1, h / 2 + 1, w - 3, h - 3);

    // body (nose points +X / right)
    g.fillStyle(bodyColor, 1);
    g.fillRoundedRect(2, 1, w - 4, h - 2, 3);

    // accent stripe
    g.fillStyle(accentColor, 1);
    g.fillRect(2, h / 2 - 1, w - 4, 2);

    // windshield / cabin (slightly toward rear so nose reads clearly)
    g.fillStyle(0x1c2430, 0.9);
    g.fillRoundedRect(w * 0.42, 2.5, w * 0.28, h - 5, 1.5);

    // headlights
    g.fillStyle(0xfff6c8, 1);
    g.fillRect(w - 4, 2, 2, 2);
    g.fillRect(w - 4, h - 4, 2, 2);

    // taillights
    g.fillStyle(0xaa1f1f, 1);
    g.fillRect(1, 2, 2, 2);
    g.fillRect(1, h - 4, 2, 2);

    // outline
    g.lineStyle(1, 0x14171c, 0.6);
    g.strokeRoundedRect(2, 1, w - 4, h - 2, 3);
  });
}

export function generateGroundTileTexture(scene: Phaser.Scene, theme: string): void {
  const key = `ground_${theme}`;
  const base = themeGroundColor(theme);
  makeTexture(scene, key, 32, 32, (g) => {
    g.fillStyle(base, 1);
    g.fillRect(0, 0, 32, 32);
    const rng = mulberryLocal(hashString(theme));
    if (theme === 'countryside' || theme === 'highway') {
      g.fillStyle(shade(base, -0.08), 1);
      for (let i = 0; i < 26; i++) {
        const x = rng() * 32;
        const y = rng() * 32;
        g.fillRect(x, y, 1, 3);
      }
    } else if (theme === 'desert') {
      g.fillStyle(shade(base, -0.1), 1);
      for (let i = 0; i < 18; i++) g.fillCircle(rng() * 32, rng() * 32, 1);
      g.fillStyle(shade(base, 0.12), 1);
      for (let i = 0; i < 10; i++) g.fillCircle(rng() * 32, rng() * 32, 1);
    } else if (theme === 'snow') {
      g.fillStyle(shade(base, -0.05), 1);
      for (let i = 0; i < 14; i++) g.fillCircle(rng() * 32, rng() * 32, 1);
      g.fillStyle(0xffffff, 0.9);
      for (let i = 0; i < 10; i++) g.fillCircle(rng() * 32, rng() * 32, 0.8);
    } else {
      // city: subtle pavement seams
      g.lineStyle(1, shade(base, -0.15), 0.6);
      g.strokeRect(0, 0, 32, 32);
      g.fillStyle(shade(base, -0.1), 1);
      for (let i = 0; i < 8; i++) g.fillRect(rng() * 32, rng() * 32, 2, 2);
    }
  });
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberryLocal(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const adjust = (c: number) => Phaser.Math.Clamp(Math.round(c + 255 * amount), 0, 255);
  return (adjust(r) << 16) | (adjust(g) << 8) | adjust(b);
}

export function generateFuelPickupTexture(scene: Phaser.Scene): void {
  makeTexture(scene, 'fuelPickup', 16, 16, (g) => {
    g.fillStyle(0x1c2430, 1);
    g.fillRoundedRect(2, 2, 12, 12, 2);
    g.fillStyle(0xffd23f, 1);
    g.fillRoundedRect(3, 3, 10, 10, 2);
    g.fillStyle(0x1c2430, 1);
    g.fillRect(6, 5, 4, 6);
  });
}

export function generateParticleTextures(scene: Phaser.Scene): void {
  makeTexture(scene, 'sparkParticle', 6, 6, (g) => {
    g.fillStyle(0xfff2b0, 1);
    g.fillCircle(3, 3, 3);
  });
  makeTexture(scene, 'smokeParticle', 8, 8, (g) => {
    g.fillStyle(0xcccccc, 0.55);
    g.fillCircle(4, 4, 4);
  });
  makeTexture(scene, 'skidParticle', 6, 3, (g) => {
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, 6, 3);
  });
}

type DrawFn = (g: Phaser.GameObjects.Graphics, size: { w: number; h: number }) => void;

const SCENERY_DRAWERS: Record<string, { w: number; h: number; draw: DrawFn }> = {
  building: {
    w: 34,
    h: 44,
    draw: (g, s) => {
      g.fillStyle(0x2c2f3a, 1);
      g.fillRect(2, 6, s.w - 4, s.h - 8);
      g.fillStyle(0x53617a, 1);
      for (let y = 10; y < s.h - 6; y += 8) {
        for (let x = 5; x < s.w - 5; x += 9) {
          g.fillRect(x, y, 4, 5);
        }
      }
      g.fillStyle(0x1a1c22, 1);
      g.fillRect(0, 2, s.w, 6);
    }
  },
  streetlamp: {
    w: 6,
    h: 30,
    draw: (g, s) => {
      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(s.w / 2 - 1, 4, 2, s.h - 6);
      g.fillStyle(0xffe9a8, 1);
      g.fillCircle(s.w / 2, 4, 3);
    }
  },
  sign: {
    w: 14,
    h: 22,
    draw: (g, s) => {
      g.fillStyle(0x555555, 1);
      g.fillRect(s.w / 2 - 1, 6, 2, s.h - 6);
      g.fillStyle(0x2e7d32, 1);
      g.fillRoundedRect(0, 0, s.w, 10, 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(2, 4, s.w - 4, 2);
    }
  },
  billboard: {
    w: 30,
    h: 24,
    draw: (g, s) => {
      g.fillStyle(0x555555, 1);
      g.fillRect(3, 12, 2, s.h - 12);
      g.fillRect(s.w - 5, 12, 2, s.h - 12);
      g.fillStyle(0xdedede, 1);
      g.fillRect(0, 0, s.w, 13);
      g.fillStyle(0xe8483a, 1);
      g.fillRect(3, 3, s.w - 6, 7);
    }
  },
  bush: {
    w: 16,
    h: 12,
    draw: (g, s) => {
      g.fillStyle(0x2f6b33, 1);
      g.fillCircle(4, 7, 5);
      g.fillCircle(10, 6, 6);
      g.fillCircle(14, 8, 4);
    }
  },
  tree: {
    w: 24,
    h: 34,
    draw: (g, s) => {
      g.fillStyle(0x5b3a22, 1);
      g.fillRect(s.w / 2 - 2, 20, 4, 14);
      g.fillStyle(0x2f6b33, 1);
      g.fillCircle(s.w / 2, 12, 12);
      g.fillStyle(0x387d3d, 1);
      g.fillCircle(s.w / 2 - 4, 8, 7);
    }
  },
  silo: {
    w: 20,
    h: 34,
    draw: (g, s) => {
      g.fillStyle(0xb8bfc7, 1);
      g.fillRoundedRect(2, 4, s.w - 4, s.h - 4, 8);
      g.fillStyle(0x8a929c, 1);
      g.fillEllipse(s.w / 2, 5, s.w - 6, 6);
    }
  },
  fence: {
    w: 22,
    h: 10,
    draw: (g, s) => {
      g.fillStyle(0x8a6b3f, 1);
      g.fillRect(0, 2, s.w, 2);
      g.fillRect(0, 6, s.w, 2);
      g.fillRect(1, 0, 2, s.h);
      g.fillRect(s.w - 3, 0, 2, s.h);
    }
  },
  cactus: {
    w: 16,
    h: 30,
    draw: (g, s) => {
      g.fillStyle(0x3f8a4a, 1);
      g.fillRoundedRect(s.w / 2 - 3, 4, 6, s.h - 6, 3);
      g.fillRoundedRect(1, 12, 6, 12, 3);
      g.fillRoundedRect(s.w - 7, 8, 6, 14, 3);
    }
  },
  deadTree: {
    w: 18,
    h: 28,
    draw: (g, s) => {
      g.lineStyle(3, 0x5a4632, 1);
      g.beginPath();
      g.moveTo(s.w / 2, s.h);
      g.lineTo(s.w / 2, 8);
      g.lineTo(4, 2);
      g.moveTo(s.w / 2, 14);
      g.lineTo(s.w - 3, 6);
      g.strokePath();
    }
  },
  rock: {
    w: 16,
    h: 12,
    draw: (g, s) => {
      g.fillStyle(0x8b8378, 1);
      g.fillEllipse(s.w / 2, s.h / 2 + 1, s.w - 2, s.h - 2);
      g.fillStyle(0xa39a8c, 1);
      g.fillEllipse(s.w / 2 - 2, s.h / 2 - 1, s.w / 2, s.h / 2);
    }
  },
  pine: {
    w: 20,
    h: 34,
    draw: (g, s) => {
      g.fillStyle(0x4a3626, 1);
      g.fillRect(s.w / 2 - 2, 26, 4, 8);
      g.fillStyle(0x2e5c3d, 1);
      g.fillTriangle(s.w / 2, 0, 1, 22, s.w - 1, 22);
      g.fillStyle(0x367048, 1);
      g.fillTriangle(s.w / 2, 6, 3, 26, s.w - 3, 26);
      g.fillStyle(0xffffff, 0.85);
      g.fillTriangle(s.w / 2, 4, 6, 18, s.w - 6, 18);
    }
  },
  snowman: {
    w: 16,
    h: 24,
    draw: (g, s) => {
      g.fillStyle(0xf4f8fb, 1);
      g.fillCircle(s.w / 2, s.h - 6, 6);
      g.fillCircle(s.w / 2, s.h - 15, 4.5);
      g.fillStyle(0xff8a1f, 1);
      g.fillTriangle(s.w / 2, s.h - 15, s.w / 2 + 5, s.h - 14, s.w / 2, s.h - 13);
    }
  },
  // hazards
  trafficCone: {
    w: 10,
    h: 14,
    draw: (g, s) => {
      g.fillStyle(0xff7a1a, 1);
      g.fillTriangle(s.w / 2, 0, 1, s.h - 2, s.w - 1, s.h - 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(2, s.h - 7, s.w - 4, 2);
    }
  },
  oilDrum: {
    w: 12,
    h: 16,
    draw: (g, s) => {
      g.fillStyle(0x8a1f1f, 1);
      g.fillRoundedRect(1, 1, s.w - 2, s.h - 2, 2);
      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(1, 5, s.w - 2, 2);
      g.fillRect(1, 10, s.w - 2, 2);
    }
  },
  barrier: {
    w: 26,
    h: 10,
    draw: (g, s) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, s.w, s.h, 2);
      g.fillStyle(0xd6432f, 1);
      for (let x = 1; x < s.w - 4; x += 8) g.fillRect(x, 1, 4, s.h - 2);
    }
  },
  roadwork: {
    w: 14,
    h: 16,
    draw: (g, s) => {
      g.fillStyle(0xf2c31c, 1);
      g.fillTriangle(s.w / 2, 0, 0, s.h, s.w, s.h);
      g.fillStyle(0x1a1a1a, 1);
      g.fillRect(s.w / 2 - 3, s.h - 7, 6, 2);
    }
  },
  hayBale: {
    w: 18,
    h: 14,
    draw: (g, s) => {
      g.fillStyle(0xd9b34a, 1);
      g.fillRoundedRect(0, 1, s.w, s.h - 2, 4);
      g.lineStyle(1, 0xa9822f, 1);
      g.strokeRoundedRect(0, 1, s.w, s.h - 2, 4);
      g.strokeCircle(s.w / 2, s.h / 2, s.h / 2 - 1);
    }
  },
  tractor: {
    w: 22,
    h: 16,
    draw: (g, s) => {
      g.fillStyle(0x3f8a3f, 1);
      g.fillRoundedRect(0, 4, 14, 8, 2);
      g.fillRoundedRect(10, 0, 10, 8, 2);
      g.fillStyle(0x222222, 1);
      g.fillCircle(4, 13, 4);
      g.fillCircle(16, 13, 3);
    }
  },
  fencePost: {
    w: 6,
    h: 16,
    draw: (g, s) => {
      g.fillStyle(0x6b4a2a, 1);
      g.fillRect(2, 0, 2, s.h);
    }
  },
  cactusHazard: {
    w: 14,
    h: 22,
    draw: (g, s) => {
      g.fillStyle(0x3f8a4a, 1);
      g.fillRoundedRect(s.w / 2 - 3, 2, 6, s.h - 4, 3);
    }
  },
  icePatch: {
    w: 30,
    h: 18,
    draw: (g, s) => {
      g.fillStyle(0xbfe4f5, 0.65);
      g.fillEllipse(s.w / 2, s.h / 2, s.w, s.h);
      g.lineStyle(1, 0xffffff, 0.7);
      g.strokeEllipse(s.w / 2, s.h / 2, s.w - 4, s.h - 4);
    }
  },
  snowbank: {
    w: 26,
    h: 14,
    draw: (g, s) => {
      g.fillStyle(0xf4f8fb, 1);
      g.fillEllipse(s.w / 2, s.h / 2 + 2, s.w, s.h);
      g.fillStyle(0xe3ecf2, 1);
      g.fillEllipse(s.w / 2 - 4, s.h / 2, s.w / 2, s.h / 2);
    }
  },
  pineFallen: {
    w: 26,
    h: 10,
    draw: (g, s) => {
      g.fillStyle(0x5a4632, 1);
      g.fillRoundedRect(0, s.h / 2 - 3, s.w, 6, 3);
      g.fillStyle(0x3a2c1e, 1);
      g.fillCircle(3, s.h / 2, 3);
    }
  }
};

export function generateAllSceneryTextures(scene: Phaser.Scene): void {
  for (const [type, def] of Object.entries(SCENERY_DRAWERS)) {
    makeTexture(scene, `scenery_${type}`, def.w, def.h, (g) => def.draw(g, { w: def.w, h: def.h }));
  }
}

export function sceneryTextureSize(type: string): { w: number; h: number } {
  const d = SCENERY_DRAWERS[type];
  return d ? { w: d.w, h: d.h } : { w: 16, h: 16 };
}
