// GraphqlQueryError import removed - handling errors differently
import logger from "app/utils/logger";

export interface ShopifyTheme {
  id: string;
  name: string;
  role: string;
  processing: boolean;
  previewable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionInstallData {
  liquidCode: string;
  cssCode?: string;
  jsCode?: string;
  schema?: any;
}

export interface Asset {
  key: string;
  value?: string;
  attachment?: string;
  contentType?: string;
}

/**
 * Shopify Theme service for section installation
 */
export class ShopifyThemeService {
  /**
   * Get all themes for a shop
   */
  async getThemes(admin: any): Promise<ShopifyTheme[]> {
    try {
      const response = await admin.graphql(`
        query getThemes {
          themes(first: 50) {
            edges {
              node {
                id
                name
                role
                processing
                previewable
                createdAt
                updatedAt
              }
            }
          }
        }
      `);

      const data = await response.json();
      
      if (data.errors) {
        logger.error("GraphQL errors in theme query", data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data.themes.edges.map((edge: any) => edge.node);
    } catch (error) {
      logger.error("Failed to fetch themes", error);
      throw new Error("Failed to fetch themes");
    }
  }

  /**
   * Get the main/published theme
   */
  async getMainTheme(admin: any): Promise<ShopifyTheme | null> {
    const themes = await this.getThemes(admin);
    return themes.find(theme => theme.role === "main") || null;
  }

  /**
   * Install section to theme
   */
  async installSectionToTheme(
    admin: any,
    themeId: string,
    sectionName: string,
    sectionData: SectionInstallData
  ): Promise<boolean> {
    try {
      logger.info("Installing section to theme", { themeId, sectionName });

      // Clean section name for file naming
      const cleanSectionName = this.cleanFileName(sectionName);
      const sectionFileName = `sections/${cleanSectionName}.liquid`;

      // Prepare the liquid code with proper section structure
      const liquidContent = this.prepareLiquidCode(sectionData.liquidCode, sectionData.schema);

      // Install the main section file
      await this.uploadAsset(admin, themeId, sectionFileName, liquidContent);

      // Install CSS if provided
      if (sectionData.cssCode) {
        const cssFileName = `assets/${cleanSectionName}.css`;
        await this.uploadAsset(admin, themeId, cssFileName, sectionData.cssCode);
      }

      // Install JS if provided
      if (sectionData.jsCode) {
        const jsFileName = `assets/${cleanSectionName}.js`;
        await this.uploadAsset(admin, themeId, jsFileName, sectionData.jsCode);
      }

      logger.info("Section installed successfully", { themeId, sectionName });
      return true;
    } catch (error) {
      logger.error("Failed to install section", { error, themeId, sectionName });
      throw error;
    }
  }

  /**
   * Upload asset to theme
   */
  private async uploadAsset(
    admin: any,
    themeId: string,
    key: string,
    value: string
  ): Promise<void> {
    try {
      const mutation = `
        mutation themeFilesUpsert($files: [OnlineStoreThemeFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles {
              filename
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        themeId: themeId,
        files: [
          {
            filename: key,
            body: {
              type: "TEXT",
              value: value,
            },
          },
        ],
      };

      const response = await admin.graphql(mutation, { variables });
      const data = await response.json();

      if (data.errors || data.data.themeFilesUpsert.userErrors.length > 0) {
        const errors = data.errors || data.data.themeFilesUpsert.userErrors;
        throw new Error(`Failed to upload asset: ${JSON.stringify(errors)}`);
      }

      logger.info("Asset uploaded successfully", { key, themeId });
    } catch (error) {
      logger.error("Failed to upload asset", { error, key, themeId });
      throw error;
    }
  }

  /**
   * Check if section already exists in theme
   */
  async sectionExists(admin: any, themeId: string, sectionName: string): Promise<boolean> {
    try {
      const cleanSectionName = this.cleanFileName(sectionName);
      const sectionFileName = `sections/${cleanSectionName}.liquid`;

      const query = `
        query getThemeFile($themeId: ID!, $filename: String!) {
          themeFile(themeId: $themeId, filename: $filename) {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      `;

      const variables = {
        themeId,
        filename: sectionFileName,
      };

      const response = await admin.graphql(query, { variables });
      const data = await response.json();

      return !!data.data.themeFile;
    } catch (error) {
      logger.error("Failed to check if section exists", error);
      return false;
    }
  }

  /**
   * Prepare liquid code for installation
   */
  private prepareLiquidCode(liquidCode: string, schema?: any): string {
    // If schema is provided separately, ensure it's properly embedded
    if (schema && !liquidCode.includes("{% schema %}")) {
      const schemaJson = JSON.stringify(schema, null, 2);
      liquidCode += `\n\n{% schema %}\n${schemaJson}\n{% endschema %}`;
    }

    // Add comment header
    const header = `{%- comment -%}
  This section was installed from the Section Store
  Visit https://your-section-store.com for more free sections
{%- endcomment -%}\n\n`;

    return header + liquidCode;
  }

  /**
   * Clean filename for Shopify compatibility
   */
  private cleanFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Get theme file content
   */
  async getThemeFile(admin: any, themeId: string, filename: string): Promise<string | null> {
    try {
      const query = `
        query getThemeFile($themeId: ID!, $filename: String!) {
          themeFile(themeId: $themeId, filename: $filename) {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      `;

      const variables = { themeId, filename };
      const response = await admin.graphql(query, { variables });
      const data = await response.json();

      return data.data.themeFile?.body?.content || null;
    } catch (error) {
      logger.error("Failed to get theme file", error);
      return null;
    }
  }

  /**
   * Validate theme compatibility
   */
  async validateThemeCompatibility(admin: any, themeId: string): Promise<boolean> {
    try {
      // Check if theme supports sections
      const mainLayoutContent = await this.getThemeFile(admin, themeId, "layout/theme.liquid");
      
      if (!mainLayoutContent) {
        return false;
      }

      // Check for required Liquid tags that indicate section support
      const hasContentForLayout = mainLayoutContent.includes("{{ content_for_layout }}");
      const hasSectionSupport = mainLayoutContent.includes("{% section") || mainLayoutContent.includes("{{ section");

      return hasContentForLayout && hasSectionSupport;
    } catch (error) {
      logger.error("Failed to validate theme compatibility", error);
      return false;
    }
  }
}

export const shopifyThemeService = new ShopifyThemeService();