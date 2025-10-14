/**
 * Image Integrator
 * Handles image references, optimization, and integration with Object Storage
 */

import { Logger } from '../../../utils/logger';
import { ObjectStorageService } from '../../../objectStorage';
import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type {
  ImageReference,
  ImageOptions,
  ProcessedImage,
  ImageError
} from './types';

const logger = new Logger('ImageIntegrator');

export class ImageIntegrator {
  private objectStorage: ObjectStorageService;
  private imageCache: Map<string, ProcessedImage>;
  private readonly imageRegex = /\[image\s+(\w+)\s+([^\]]+)\]/g;
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly supportedFormats = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

  constructor() {
    this.objectStorage = new ObjectStorageService();
    this.imageCache = new Map();
  }

  /**
   * Extract image references from template
   */
  public extractImageReferences(template: string): ImageReference[] {
    const references: ImageReference[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = this.imageRegex.exec(template)) !== null) {
      const raw = match[0];
      
      if (seen.has(raw)) {
        continue;
      }
      seen.add(raw);

      const reference = this.parseImageReference(raw, match[1], match[2], match.index);
      references.push(reference);
    }

    logger.debug('Extracted image references', { count: references.length });
    return references;
  }

  /**
   * Parse image reference
   */
  private parseImageReference(
    raw: string,
    type: string,
    identifier: string,
    index: number
  ): ImageReference {
    const reference: ImageReference = {
      raw,
      type: type as ImageReference['type'],
      identifier: isNaN(Number(identifier)) ? identifier : Number(identifier),
      position: {
        line: 0,
        column: 0,
        index,
        length: raw.length
      }
    };

    // Parse options from identifier if present
    const parts = identifier.split(' ');
    if (parts.length > 1) {
      reference.identifier = parts[0];
      reference.options = this.parseImageOptions(parts.slice(1).join(' '));
    }

    return reference;
  }

  /**
   * Parse image options
   */
  private parseImageOptions(optionsStr: string): ImageOptions {
    const options: ImageOptions = {};
    const pairs = optionsStr.match(/(\w+)=["']?([^"'\s]+)["']?/g);

    if (pairs) {
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        const cleanValue = value.replace(/["']/g, '');

        switch (key) {
          case 'width':
          case 'height':
          case 'maxWidth':
          case 'maxHeight':
            options[key] = isNaN(Number(cleanValue)) ? cleanValue : Number(cleanValue);
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
        }
      }
    }

    return options;
  }

  /**
   * Process images for template
   */
  public async processImages(
    references: ImageReference[],
    providedImages: Record<string, string | ProcessedImage>
  ): Promise<{
    successful: ImageReference[];
    failed: ImageReference[];
    processed: Record<string, ProcessedImage>;
  }> {
    const successful: ImageReference[] = [];
    const failed: ImageReference[] = [];
    const processed: Record<string, ProcessedImage> = {};

    for (const reference of references) {
      try {
        const processedImage = await this.processImage(reference, providedImages);
        processed[reference.raw] = processedImage;
        successful.push(reference);
      } catch (error) {
        logger.error('Failed to process image', error as Error, {
          reference: reference.raw
        });

        // Try fallback if available
        if (reference.options?.fallback) {
          try {
            const fallbackImage = await this.loadFallbackImage(reference.options.fallback);
            processed[reference.raw] = fallbackImage;
            successful.push(reference);
          } catch (fallbackError) {
            failed.push(reference);
          }
        } else {
          failed.push(reference);
        }
      }
    }

    logger.info('Images processed', {
      successful: successful.length,
      failed: failed.length
    });

    return { successful, failed, processed };
  }

  /**
   * Process single image
   */
  private async processImage(
    reference: ImageReference,
    providedImages: Record<string, string | ProcessedImage>
  ): Promise<ProcessedImage> {
    // Check cache
    const cacheKey = this.getCacheKey(reference);
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    // Check provided images
    const providedImage = providedImages[reference.raw] || 
                         providedImages[String(reference.identifier)];
    if (providedImage) {
      if (typeof providedImage === 'string') {
        return this.loadImageFromPath(providedImage, reference.options);
      }
      return providedImage;
    }

    // Load from object storage
    const imagePath = await this.resolveImagePath(reference);
    const processedImage = await this.loadImageFromObjectStorage(imagePath, reference.options);

    // Cache result
    this.imageCache.set(cacheKey, processedImage);

    return processedImage;
  }

  /**
   * Resolve image path in object storage
   */
  private async resolveImagePath(reference: ImageReference): Promise<string> {
    let basePath: string;

    switch (reference.type) {
      case 'pub':
        const publicPaths = this.objectStorage.getPublicObjectSearchPaths();
        basePath = publicPaths[0] || 'public';
        break;
      case 'private':
        basePath = process.env.PRIVATE_OBJECT_DIR || '.private';
        break;
      case 'product':
        basePath = 'public/products';
        break;
      case 'logo':
        basePath = 'public/logos';
        break;
      case 'signature':
        basePath = '.private/signatures';
        break;
      default:
        basePath = 'public';
    }

    // Construct full path
    const identifier = String(reference.identifier);
    const path = `${basePath}/${identifier}`;

    // Try with common extensions if no extension specified
    if (!identifier.includes('.')) {
      for (const ext of this.supportedFormats) {
        const fullPath = `${path}.${ext}`;
        try {
          await this.objectStorage.headObject(fullPath);
          return fullPath;
        } catch {
          // Continue to next extension
        }
      }
    }

    return path;
  }

  /**
   * Load image from object storage
   */
  private async loadImageFromObjectStorage(
    path: string,
    options?: ImageOptions
  ): Promise<ProcessedImage> {
    try {
      const buffer = await this.objectStorage.getObject(path);
      return this.processImageBuffer(buffer, options);
    } catch (error) {
      throw new Error(`Failed to load image from object storage: ${path}`);
    }
  }

  /**
   * Load image from file path
   */
  private async loadImageFromPath(
    path: string,
    options?: ImageOptions
  ): Promise<ProcessedImage> {
    try {
      const buffer = await readFile(path);
      return this.processImageBuffer(buffer, options);
    } catch (error) {
      throw new Error(`Failed to load image from path: ${path}`);
    }
  }

  /**
   * Load fallback image
   */
  private async loadFallbackImage(fallbackPath: string): Promise<ProcessedImage> {
    const defaultFallbackPath = join(__dirname, '../../../assets/placeholder.png');
    const path = fallbackPath || defaultFallbackPath;

    try {
      const buffer = await readFile(path);
      return this.processImageBuffer(buffer);
    } catch (error) {
      // Return a simple placeholder
      return {
        base64: this.generatePlaceholderImage(),
        width: 300,
        height: 200,
        format: 'svg',
        size: 1024,
        optimized: false
      };
    }
  }

  /**
   * Process image buffer with optimizations
   */
  private async processImageBuffer(
    buffer: Buffer,
    options?: ImageOptions
  ): Promise<ProcessedImage> {
    let processedBuffer = buffer;
    let metadata;

    try {
      const image = sharp(buffer);
      metadata = await image.metadata();

      // Apply resizing if specified
      if (options?.width || options?.height) {
        image.resize({
          width: options.width ? Number(options.width) : undefined,
          height: options.height ? Number(options.height) : undefined,
          fit: options.fit || 'contain',
          position: options.position || 'center'
        });
      }

      // Apply max dimensions if specified
      if (options?.maxWidth || options?.maxHeight) {
        const currentWidth = metadata.width || 0;
        const currentHeight = metadata.height || 0;
        const maxWidth = options.maxWidth ? Number(options.maxWidth) : currentWidth;
        const maxHeight = options.maxHeight ? Number(options.maxHeight) : currentHeight;

        if (currentWidth > maxWidth || currentHeight > maxHeight) {
          image.resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside'
          });
        }
      }

      // Apply quality for JPEG images
      if (metadata.format === 'jpeg' && options?.quality) {
        image.jpeg({ quality: options.quality });
      }

      // Convert to buffer
      processedBuffer = await image.toBuffer();

      // Update metadata after processing
      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        base64: `data:image/${processedMetadata.format};base64,${processedBuffer.toString('base64')}`,
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        format: processedMetadata.format || 'unknown',
        size: processedBuffer.length,
        optimized: true
      };
    } catch (error) {
      logger.warn('Failed to optimize image, using original', { error });

      // Fallback to original
      return {
        base64: `data:image/png;base64,${buffer.toString('base64')}`,
        width: metadata?.width || 0,
        height: metadata?.height || 0,
        format: metadata?.format || 'png',
        size: buffer.length,
        optimized: false
      };
    }
  }

  /**
   * Inject processed images into HTML
   */
  public async injectImages(
    html: string,
    processedImages: Record<string, ProcessedImage>
  ): Promise<string> {
    let result = html;

    for (const [reference, image] of Object.entries(processedImages)) {
      // Replace image reference with img tag
      const imgTag = this.createImageTag(image, reference);
      result = result.replace(new RegExp(this.escapeRegExp(reference), 'g'), imgTag);
    }

    return result;
  }

  /**
   * Create HTML img tag
   */
  private createImageTag(image: ProcessedImage, reference: string): string {
    const alt = this.extractAltText(reference) || 'Image';
    
    if (image.base64) {
      return `<img src="${image.base64}" alt="${alt}" width="${image.width}" height="${image.height}" />`;
    } else if (image.url) {
      return `<img src="${image.url}" alt="${alt}" width="${image.width}" height="${image.height}" />`;
    }

    return `<!-- Image not available: ${reference} -->`;
  }

  /**
   * Extract alt text from reference
   */
  private extractAltText(reference: string): string | null {
    const altMatch = reference.match(/alt=["']?([^"'\]]+)["']?/);
    return altMatch ? altMatch[1] : null;
  }

  /**
   * Generate cache key for image
   */
  private getCacheKey(reference: ImageReference): string {
    const options = JSON.stringify(reference.options || {});
    return `${reference.type}:${reference.identifier}:${options}`;
  }

  /**
   * Generate placeholder SVG
   */
  private generatePlaceholderImage(): string {
    const svg = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="300" height="200" fill="#f0f0f0"/>
        <text x="150" y="100" text-anchor="middle" fill="#999" font-size="16">
          Image Not Available
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Escape regex special characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clear image cache
   */
  public clearCache(): void {
    this.imageCache.clear();
    logger.info('Image cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.imageCache.size,
      entries: Array.from(this.imageCache.keys())
    };
  }
}