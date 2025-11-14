import { ObjectStorageService } from '../../../objectStorage';
import { logger } from '../../../utils/logger';
import type { ImageReference, ImageOptions, ProcessedImage } from '../types';

interface ProcessedImageMap {
  [rawPlaceholder: string]: ProcessedImage;
}

const IMAGE_PLACEHOLDER_REGEX = /\[image\s+(\w+)\s+([^\]]+)\]/g;
const SUPPORTED_FORMATS = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp']);

export class ImageIntegrator {
  private readonly storage = new ObjectStorageService();
  private readonly cache = new Map<string, ProcessedImage>();

  extractImageReferences(template: string): ImageReference[] {
    const references: ImageReference[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = IMAGE_PLACEHOLDER_REGEX.exec(template)) !== null) {
      const raw = match[0];
      if (seen.has(raw)) {
        continue;
      }
      seen.add(raw);

      const type = match[1] as ImageReference['type'];
      const identifierWithOptions = match[2];
      const [identifier, ...optionTokens] = identifierWithOptions.split(' ');

      const reference: ImageReference = {
        raw,
        type,
        identifier: this.parseIdentifier(identifier),
        options: optionTokens.length ? this.parseOptions(optionTokens.join(' ')) : undefined,
        position: {
          line: 0,
          column: 0,
          index: match.index,
          length: raw.length,
        },
      };

      references.push(reference);
    }

    return references;
  }

  async processImages(references: ImageReference[]): Promise<ProcessedImageMap> {
    const processed: ProcessedImageMap = {};

    for (const reference of references) {
      if (this.cache.has(reference.raw)) {
        processed[reference.raw] = this.cache.get(reference.raw)!;
        continue;
      }

      const resolved = await this.resolveImage(reference);
      processed[reference.raw] = resolved;
      this.cache.set(reference.raw, resolved);
    }

    return processed;
  }

  injectImages(template: string, images: ProcessedImageMap): string {
    return template.replace(IMAGE_PLACEHOLDER_REGEX, (_match, _type, _identifier, offset) => {
      const raw = template.slice(offset, template.indexOf(']', offset) + 1);
      const image = images[raw];

      if (!image) {
        return '';
      }

      if (image.url) {
        return `<img src="${image.url}" alt="" />`;
      }

      if (image.base64) {
        return `<img src="data:image/${image.format};base64,${image.base64}" alt="" />`;
      }

      return '';
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  private parseIdentifier(identifier: string): string | number {
    const numeric = Number(identifier);
    return Number.isNaN(numeric) ? identifier : numeric;
  }

  private parseOptions(optionsStr: string): ImageOptions {
    const options: ImageOptions = {};
    const matches = optionsStr.match(/(\w+)=(["']?[^"'\s]+["']?)/g);

    if (!matches) {
      return options;
    }

    for (const token of matches) {
      const [key, rawValue] = token.split('=');
      const cleanValue = rawValue.replace(/["']/g, '');

      switch (key) {
        case 'width':
        case 'height':
        case 'maxWidth':
        case 'maxHeight':
          options[key] = Number.isNaN(Number(cleanValue)) ? cleanValue : Number(cleanValue);
          break;
        case 'quality':
          options.quality = Number(cleanValue);
          break;
        case 'fit':
          options.fit = cleanValue as ImageOptions['fit'];
          break;
        case 'position':
          options.position = cleanValue as ImageOptions['position'];
          break;
        case 'fallback':
          options.fallback = cleanValue;
          break;
        case 'alt':
          options.alt = cleanValue;
          break;
        default:
          break;
      }
    }

    return options;
  }

  private async resolveImage(reference: ImageReference): Promise<ProcessedImage> {
    const identifier = String(reference.identifier);
    const format = this.detectFormat(identifier, reference.options?.fallback);

    if (reference.options?.fallback) {
      return {
        url: this.storage.normalizeObjectEntityPath(reference.options.fallback),
        width: 0,
        height: 0,
        format,
        size: 0,
        optimized: false,
      };
    }

    const normalizedPath = this.storage.normalizeObjectEntityPath(identifier);
    const exists = await this.storage.objectExists(normalizedPath);

    if (!exists) {
      logger.warn('ImageIntegrator: image introuvable, utilisation d\'un espace réservé', {
        metadata: { identifier: reference.identifier },
      });

      return {
        url: undefined,
        base64: undefined,
        width: 0,
        height: 0,
        format,
        size: 0,
        optimized: false,
      };
    }

    return {
      url: normalizedPath,
      width: 0,
      height: 0,
      format,
      size: 0,
      optimized: false,
    };
  }

  private detectFormat(identifier: string, fallback?: string): string {
    const candidates = [identifier, fallback].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const match = candidate.match(/\.([a-zA-Z0-9]+)$/);
      if (match) {
        const ext = match[1].toLowerCase();
        if (SUPPORTED_FORMATS.has(ext)) {
          return ext;
        }
      }
    }
    return 'png';
  }
}
