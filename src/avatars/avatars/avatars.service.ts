import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readdirSync } from 'fs';
import { join } from 'path';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg)$/i;

@Injectable()
export class AvatarsService implements OnModuleInit {
  private readonly logger = new Logger(AvatarsService.name);
  private readonly avatarsDir: string;
  private avatars: string[] = [];

  constructor() {
    this.avatarsDir = join(process.cwd(), 'public', 'avatars');
  }

  onModuleInit() {
    this.avatars = this.loadAvatars(this.avatarsDir);
    if (this.avatars.length === 0) {
      this.logger.warn(
        `No se encontraron imágenes de avatar en ${this.avatarsDir}`,
      );
    }
  }

  /** Lee el directorio y devuelve solo los archivos de imagen. */
  loadAvatars(dir: string): string[] {
    try {
      return this.filterImages(readdirSync(dir));
    } catch {
      return [];
    }
  }

  filterImages(files: string[]): string[] {
    return files.filter((file) => IMAGE_EXTENSIONS.test(file));
  }

  /** Solo para pruebas: fija el pool de avatares en memoria. */
  setAvatars(avatars: string[]): void {
    this.avatars = avatars;
  }

  /**
   * Devuelve la ruta relativa de un avatar aleatorio (ej. `/static/avatars/x.svg`),
   * o null si el pool está vacío. El cliente la compone con su API_BASE_URL.
   */
  getRandom(): { url: string } | null {
    if (this.avatars.length === 0) {
      return null;
    }

    const name =
      this.avatars[Math.floor(Math.random() * this.avatars.length)];
    return { url: `/static/avatars/${name}` };
  }
}
