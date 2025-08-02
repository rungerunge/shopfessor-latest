import { seedSectionStore } from "./seed-sections";
import logger from "app/utils/logger";

async function main() {
  try {
    logger.info("Starting development seed...");
    
    // Seed Section Store data
    await seedSectionStore();
    
    logger.info("Development seed completed successfully!");
  } catch (error) {
    logger.error("Development seed failed:", error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;