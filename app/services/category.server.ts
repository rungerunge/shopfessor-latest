import prisma from "app/lib/db.server";
import type { Category } from "@prisma/client";
import logger from "app/utils/logger";

export interface CategoryData {
  name: string;
  slug: string;
  icon?: string;
  order?: number;
}

/**
 * Category service for managing section categories
 */
export class CategoryService {
  /**
   * Get all active categories
   */
  async getAllCategories(): Promise<Category[]> {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { sections: { where: { isActive: true } } },
        },
      },
    });
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CategoryData): Promise<Category> {
    try {
      // Check if slug already exists
      const existingCategory = await prisma.category.findUnique({
        where: { slug: categoryData.slug },
      });

      if (existingCategory) {
        throw new Error("Category with this slug already exists");
      }

      // Get the next order number if not provided
      let order = categoryData.order;
      if (order === undefined) {
        const lastCategory = await prisma.category.findFirst({
          orderBy: { order: "desc" },
        });
        order = (lastCategory?.order || 0) + 1;
      }

      const category = await prisma.category.create({
        data: {
          name: categoryData.name,
          slug: categoryData.slug,
          icon: categoryData.icon,
          order,
        },
      });

      logger.info("Category created successfully", { categoryId: category.id });
      return category;
    } catch (error) {
      logger.error("Failed to create category", error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: string, categoryData: Partial<CategoryData>): Promise<Category> {
    try {
      // If updating slug, check for conflicts
      if (categoryData.slug) {
        const existingCategory = await prisma.category.findFirst({
          where: {
            slug: categoryData.slug,
            id: { not: id },
          },
        });

        if (existingCategory) {
          throw new Error("Category with this slug already exists");
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: categoryData,
      });

      logger.info("Category updated successfully", { categoryId: id });
      return category;
    } catch (error) {
      logger.error("Failed to update category", error);
      throw error;
    }
  }

  /**
   * Delete category (soft delete by setting isActive to false)
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      // Check if category has sections
      const sectionsCount = await prisma.section.count({
        where: { categoryId: id, isActive: true },
      });

      if (sectionsCount > 0) {
        throw new Error("Cannot delete category that contains sections");
      }

      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      logger.info("Category deleted successfully", { categoryId: id });
    } catch (error) {
      logger.error("Failed to delete category", error);
      throw error;
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders: { id: string; order: number }[]): Promise<void> {
    try {
      const updatePromises = categoryOrders.map(({ id, order }) =>
        prisma.category.update({
          where: { id },
          data: { order },
        })
      );

      await Promise.all(updatePromises);
      logger.info("Categories reordered successfully");
    } catch (error) {
      logger.error("Failed to reorder categories", error);
      throw error;
    }
  }

  /**
   * Generate slug from name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  /**
   * Seed default categories
   */
  async seedDefaultCategories(): Promise<void> {
    const defaultCategories = [
      { name: "Popular", slug: "popular", icon: "⭐", order: 1 },
      { name: "Trending", slug: "trending", icon: "📈", order: 2 },
      { name: "Newest", slug: "newest", icon: "🆕", order: 3 },
      { name: "Hero", slug: "hero", icon: "🦸", order: 4 },
      { name: "Features", slug: "features", icon: "✨", order: 5 },
      { name: "Testimonial", slug: "testimonial", icon: "💬", order: 6 },
      { name: "Video", slug: "video", icon: "🎥", order: 7 },
      { name: "Images", slug: "images", icon: "🖼️", order: 8 },
      { name: "Text", slug: "text", icon: "📝", order: 9 },
      { name: "Countdown", slug: "countdown", icon: "⏰", order: 10 },
      { name: "Scrolling", slug: "scrolling", icon: "📜", order: 11 },
      { name: "Snippets", slug: "snippets", icon: "🧩", order: 12 },
    ];

    for (const categoryData of defaultCategories) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug: categoryData.slug },
      });

      if (!existingCategory) {
        await this.createCategory(categoryData);
      }
    }

    logger.info("Default categories seeded successfully");
  }
}

export const categoryService = new CategoryService();