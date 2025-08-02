import { categoryService } from "app/services/category.server";
import logger from "app/utils/logger";
import prisma from "app/lib/db.server";

/**
 * Seed script for Section Store
 */
async function seedSectionStore() {
  try {
    logger.info("Starting Section Store seed...");

    // Seed default categories
    await categoryService.seedDefaultCategories();

    logger.info("Section Store seed completed successfully!");
  } catch (error) {
    logger.error("Failed to seed Section Store:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedSectionStore()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedSectionStore };