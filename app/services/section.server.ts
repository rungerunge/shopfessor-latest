import prisma from "app/lib/db.server";
import { saveUploadedFile, cleanupFile } from "./shared/file-utils.server";
import logger from "app/utils/logger";
import type { Section, Category } from "@prisma/client";

export interface SectionMetadata {
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
}

export interface SectionFiles {
  liquidFile?: File;
  cssFile?: File;
  jsFile?: File;
  schemaFile?: File;
  previewImage?: File;
}

export interface SectionData {
  title: string;
  description?: string;
  categoryId: string;
  tags: string[];
  liquidCode: string;
  cssCode?: string;
  jsCode?: string;
  schema?: any;
  previewUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Section service for managing theme sections
 */
export class SectionService {
  /**
   * Upload and create a new section
   */
  async uploadSection(
    files: SectionFiles,
    metadata: SectionMetadata
  ): Promise<Section> {
    logger.info("Starting section upload", { metadata });

    try {
      // Validate required files
      if (!files.liquidFile) {
        throw new Error("Liquid file is required");
      }

      // Validate liquid file extension
      if (!files.liquidFile.name.endsWith(".liquid")) {
        throw new Error("Liquid file must have .liquid extension");
      }

      // Read file contents
      const liquidCode = await this.readFileContent(files.liquidFile);
      const cssCode = files.cssFile ? await this.readFileContent(files.cssFile) : undefined;
      const jsCode = files.jsFile ? await this.readFileContent(files.jsFile) : undefined;
      
      let schema;
      if (files.schemaFile) {
        const schemaContent = await this.readFileContent(files.schemaFile);
        try {
          schema = JSON.parse(schemaContent);
        } catch (error) {
          throw new Error("Invalid JSON in schema file");
        }
      }

      // Validate liquid code
      await this.validateLiquidCode(liquidCode);

      // Upload preview image if provided
      let previewUrl;
      let thumbnailUrl;
      if (files.previewImage) {
        const buffer = Buffer.from(await files.previewImage.arrayBuffer());
        previewUrl = await saveUploadedFile(
          buffer,
          files.previewImage.name,
          files.previewImage.type
        );
        thumbnailUrl = previewUrl; // For now, use same image for thumbnail
      }

      // Create section in database
      const section = await prisma.section.create({
        data: {
          title: metadata.title,
          description: metadata.description,
          categoryId: metadata.categoryId,
          tags: metadata.tags,
          liquidCode,
          cssCode,
          jsCode,
          schema,
          previewUrl,
          thumbnailUrl,
        },
        include: {
          category: true,
        },
      });

      logger.info("Section uploaded successfully", { sectionId: section.id });
      return section;
    } catch (error) {
      logger.error("Failed to upload section", error);
      throw error;
    }
  }

  /**
   * Get section by ID
   */
  async getSectionById(id: string): Promise<Section | null> {
    return prisma.section.findUnique({
      where: { id },
      include: {
        category: true,
        installations: true,
      },
    });
  }

  /**
   * Get sections by category with pagination
   */
  async getSectionsByCategory(
    categoryId?: string,
    page: number = 1,
    limit: number = 12
  ): Promise<{ sections: Section[]; total: number }> {
    const where = categoryId ? { categoryId, isActive: true } : { isActive: true };
    const skip = (page - 1) * limit;

    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.section.count({ where }),
    ]);

    return { sections, total };
  }

  /**
   * Search sections by title, description, or tags
   */
  async searchSections(
    query: string,
    page: number = 1,
    limit: number = 12
  ): Promise<{ sections: Section[]; total: number }> {
    const where = {
      isActive: true,
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { description: { contains: query, mode: "insensitive" as const } },
        { tags: { hasSome: [query] } },
      ],
    };

    const skip = (page - 1) * limit;

    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.section.count({ where }),
    ]);

    return { sections, total };
  }

  /**
   * Get trending sections (most downloaded)
   */
  async getTrendingSections(limit: number = 12): Promise<Section[]> {
    return prisma.section.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { downloads: "desc" },
      take: limit,
    });
  }

  /**
   * Get newest sections
   */
  async getNewestSections(limit: number = 12): Promise<Section[]> {
    return prisma.section.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Increment download count for a section
   */
  async incrementDownloads(sectionId: string): Promise<void> {
    await prisma.section.update({
      where: { id: sectionId },
      data: { downloads: { increment: 1 } },
    });
  }

  /**
   * Validate liquid code syntax
   */
  private async validateLiquidCode(liquidCode: string): Promise<void> {
    // Basic validation - check for required Shopify section structure
    if (!liquidCode.includes("{% schema %}")) {
      throw new Error("Liquid file must contain a schema block");
    }

    if (!liquidCode.includes("{% endschema %}")) {
      throw new Error("Liquid file must contain a properly closed schema block");
    }

    // Check for potentially dangerous liquid tags
    const dangerousTags = ["{% include %}", "{% render %}", "{% assign global"];
    for (const tag of dangerousTags) {
      if (liquidCode.includes(tag)) {
        logger.warn("Potentially dangerous liquid tag detected", { tag });
      }
    }
  }

  /**
   * Read file content as string
   */
  private async readFileContent(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return buffer.toString("utf-8");
  }

  /**
   * Generate automatic preview for section (future enhancement)
   */
  async generatePreview(sectionCode: string): Promise<string | null> {
    // This would integrate with a screenshot service
    // For now, return null
    logger.info("Preview generation not yet implemented");
    return null;
  }
}

export const sectionService = new SectionService();