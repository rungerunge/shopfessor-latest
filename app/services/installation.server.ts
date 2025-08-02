import prisma from "app/lib/db.server";
import { sectionService } from "./section.server";
import { shopifyThemeService } from "./shopify-theme.server";
import type { Installation, InstallStatus } from "@prisma/client";
import logger from "app/utils/logger";

export interface InstallationRequest {
  sectionId: string;
  shopId: string;
  themeId: string;
}

export interface InstallationResult {
  success: boolean;
  installationId?: string;
  error?: string;
}

/**
 * Installation service for managing section installations
 */
export class InstallationService {
  /**
   * Install section to theme
   */
  async installSection(
    admin: any,
    request: InstallationRequest
  ): Promise<InstallationResult> {
    const { sectionId, shopId, themeId } = request;

    try {
      logger.info("Starting section installation", { sectionId, shopId, themeId });

      // Check if already installed
      const existingInstallation = await this.getInstallation(shopId, sectionId, themeId);
      if (existingInstallation && existingInstallation.status === "SUCCESS") {
        return {
          success: true,
          installationId: existingInstallation.id,
          error: "Section is already installed",
        };
      }

      // Get section data
      const section = await sectionService.getSectionById(sectionId);
      if (!section) {
        throw new Error("Section not found");
      }

      // Create installation record
      const installation = await prisma.installation.create({
        data: {
          shopId,
          sectionId,
          themeId,
          status: "PENDING",
        },
      });

      try {
        // Validate theme compatibility
        const isCompatible = await shopifyThemeService.validateThemeCompatibility(admin, themeId);
        if (!isCompatible) {
          await this.updateInstallationStatus(installation.id, "FAILED");
          return {
            success: false,
            installationId: installation.id,
            error: "Theme is not compatible with sections",
          };
        }

        // Check if section already exists in theme
        const sectionExists = await shopifyThemeService.sectionExists(admin, themeId, section.title);
        if (sectionExists) {
          logger.warn("Section already exists in theme, proceeding with update", {
            sectionId,
            themeId,
          });
        }

        // Install section to theme
        const installSuccess = await shopifyThemeService.installSectionToTheme(
          admin,
          themeId,
          section.title,
          {
            liquidCode: section.liquidCode,
            cssCode: section.cssCode || undefined,
            jsCode: section.jsCode || undefined,
            schema: section.schema,
          }
        );

        if (installSuccess) {
          // Update installation status to success
          await this.updateInstallationStatus(installation.id, "SUCCESS");

          // Increment download count
          await sectionService.incrementDownloads(sectionId);

          logger.info("Section installed successfully", {
            installationId: installation.id,
            sectionId,
            themeId,
          });

          return {
            success: true,
            installationId: installation.id,
          };
        } else {
          await this.updateInstallationStatus(installation.id, "FAILED");
          return {
            success: false,
            installationId: installation.id,
            error: "Failed to install section to theme",
          };
        }
      } catch (installError) {
        // Update installation status to failed
        await this.updateInstallationStatus(installation.id, "FAILED");
        
        logger.error("Section installation failed", {
          error: installError,
          installationId: installation.id,
        });

        return {
          success: false,
          installationId: installation.id,
          error: installError instanceof Error ? installError.message : "Installation failed",
        };
      }
    } catch (error) {
      logger.error("Failed to start section installation", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Installation failed",
      };
    }
  }

  /**
   * Get installation by shop, section, and theme
   */
  async getInstallation(
    shopId: string,
    sectionId: string,
    themeId: string
  ): Promise<Installation | null> {
    return prisma.installation.findUnique({
      where: {
        shopId_sectionId_themeId: {
          shopId,
          sectionId,
          themeId,
        },
      },
      include: {
        section: true,
        shop: true,
      },
    });
  }

  /**
   * Get installations by shop
   */
  async getInstallationsByShop(shopId: string): Promise<Installation[]> {
    return prisma.installation.findMany({
      where: { shopId },
      include: {
        section: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get installation history for a section
   */
  async getInstallationHistory(sectionId: string): Promise<Installation[]> {
    return prisma.installation.findMany({
      where: { sectionId },
      include: {
        shop: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Update installation status
   */
  async updateInstallationStatus(
    installationId: string,
    status: InstallStatus
  ): Promise<Installation> {
    return prisma.installation.update({
      where: { id: installationId },
      data: { status },
    });
  }

  /**
   * Get installation stats for a section
   */
  async getInstallationStats(sectionId: string): Promise<{
    totalInstallations: number;
    successfulInstallations: number;
    failedInstallations: number;
    uniqueShops: number;
  }> {
    const installations = await prisma.installation.findMany({
      where: { sectionId },
    });

    const totalInstallations = installations.length;
    const successfulInstallations = installations.filter(i => i.status === "SUCCESS").length;
    const failedInstallations = installations.filter(i => i.status === "FAILED").length;
    const uniqueShops = new Set(installations.map(i => i.shopId)).size;

    return {
      totalInstallations,
      successfulInstallations,
      failedInstallations,
      uniqueShops,
    };
  }

  /**
   * Check if section is installed in shop's main theme
   */
  async isInstalledInMainTheme(
    admin: any,
    shopId: string,
    sectionId: string
  ): Promise<boolean> {
    try {
      const mainTheme = await shopifyThemeService.getMainTheme(admin);
      if (!mainTheme) {
        return false;
      }

      const installation = await this.getInstallation(shopId, sectionId, mainTheme.id);
      return installation?.status === "SUCCESS";
    } catch (error) {
      logger.error("Failed to check if section is installed in main theme", error);
      return false;
    }
  }

  /**
   * Get installation analytics
   */
  async getInstallationAnalytics(days: number = 30): Promise<{
    dailyInstallations: { date: string; count: number }[];
    topSections: { sectionId: string; title: string; count: number }[];
    totalInstallations: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get installations within date range
    const installations = await prisma.installation.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: "SUCCESS",
      },
      include: {
        section: true,
      },
    });

    // Group by date
    const dailyInstallations = installations.reduce((acc, installation) => {
      const date = installation.createdAt.toISOString().split("T")[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as { date: string; count: number }[]);

    // Group by section
    const sectionCounts = installations.reduce((acc, installation) => {
      const key = installation.sectionId;
      const existing = acc.find(item => item.sectionId === key);
      if (existing) {
        existing.count++;
      } else {
        acc.push({
          sectionId: key,
          title: installation.section.title,
          count: 1,
        });
      }
      return acc;
    }, [] as { sectionId: string; title: string; count: number }[]);

    const topSections = sectionCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      dailyInstallations: dailyInstallations.sort((a, b) => a.date.localeCompare(b.date)),
      topSections,
      totalInstallations: installations.length,
    };
  }
}

export const installationService = new InstallationService();