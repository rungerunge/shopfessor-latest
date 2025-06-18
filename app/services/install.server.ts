import prisma from "app/lib/db.server.js";

const GET_SHOP = `
query {
  shop {
    name
    email
    myshopifyDomain
    primaryDomain {
        host
        url
    }
    billingAddress {
        address1
        address2
        city
        country
        zip
        firstName
        lastName
        name
    }
    createdAt
    updatedAt
    ianaTimezone
    currencyFormats {
        moneyFormat
        moneyWithCurrencyFormat
    }
    plan {
        displayName
        partnerDevelopment
        shopifyPlus
    }
  }
}
`;

const getShop = async (admin: any) => {
  try {
    const response = await admin.graphql(GET_SHOP);
    const data = await response.json();

    if (!data?.data?.shop) {
      return null;
    }
    return data.data.shop;
  } catch (error) {
    throw new Error("Failed to get shop");
  }
};

export const start = async (session: any, admin: any) => {
  console.log("Starting shop setup process", { sessionId: session.id });
  try {
    const shopData = await fetchShopData(admin);
    if (!shopData) {
      console.warn("Shop data not found, aborting setup process", {
        sessionId: session.id,
      });
      return;
    }

    const user = await findOrCreateUser(shopData);
    const shop = await findOrCreateShop(shopData, user.id);

    console.log("Shop setup process completed", {
      sessionId: session.id,
      shopId: shop?.id,
    });
  } catch (error) {
    console.error("Error during shop setup:", {
      error: error,
      sessionId: session.id,
    });
  }
};

const fetchShopData = async (admin: any) => {
  try {
    const shop = await getShop(admin);
    return shop;
  } catch (error) {
    console.error("Error fetching shop data:", {
      error: error,
    });
    return null;
  }
};

const findOrCreateUser = async (shopData: any) => {
  const email = shopData.email;

  try {
    // Try to find existing user first
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const { firstName, lastName } = shopData.billingAddress;

      try {
        // Attempt to create user
        user = await prisma.user.create({
          data: { email, firstName, lastName },
        });
        console.log("New user created", { userId: user.id });

        try {
          // await emailService.sendWelcomeEmail({ email: user.email, name });
        } catch (error) {
          console.error("Failed to send welcome email", {
            error: error,
            userId: user.id,
          });
        }
      } catch (createError: any) {
        // Handle race condition for user creation
        if (createError.code === "P2002") {
          console.log(
            "User already exists due to race condition, fetching existing user",
          );
          user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            throw new Error("Failed to find user after race condition");
          }
        } else {
          throw createError;
        }
      }
    }

    return user;
  } catch (error) {
    console.error("Error in findOrCreateUser:", { error, email });
    throw error;
  }
};

const findOrCreateShop = async (shopData: any, userId: string) => {
  const shopDomain = shopData.myshopifyDomain;

  try {
    // Try to find existing shop first
    let shop = await prisma.shop.findUnique({
      where: { shop: shopDomain },
      include: { subscriptions: true },
    });

    if (!shop) {
      try {
        // Attempt to create shop
        shop = await createShop(shopData, userId);
        console.log("New shop created", { shopId: shop?.id });
      } catch (createError: any) {
        // Handle race condition for shop creation
        if (createError.code === "P2002") {
          console.log(
            "Shop already exists due to race condition, fetching existing shop",
          );
          shop = await prisma.shop.findUnique({
            where: { shop: shopDomain },
            include: { subscriptions: true },
          });

          if (!shop) {
            throw new Error("Failed to find shop after race condition");
          }

          // Update the shop with latest data and ensure correct user association
          shop = await prisma.shop.update({
            where: { shop: shopDomain },
            data: {
              shopData: shopData,
              isActive: true,
              userId: userId, // Ensure correct user association
              settings: createShopSettings(shopData),
            },
            include: { subscriptions: true },
          });

          console.log("Shop updated after race condition", { shopId: shop.id });
        } else {
          throw createError;
        }
      }
    } else {
      // Shop exists, update it with latest data
      shop = await prisma.shop.update({
        where: { shop: shopDomain },
        data: {
          shopData: shopData,
          isActive: true,
          userId: userId, // Ensure correct user association
          settings: createShopSettings(shopData),
        },
        include: { subscriptions: true },
      });

      console.log("Existing shop updated", { shopId: shop.id });
    }

    return shop;
  } catch (error) {
    console.error("Error in findOrCreateShop:", {
      error,
      shopDomain,
      userId,
    });
    throw error;
  }
};

const createShop = async (shopData: any, userId: string) => {
  const settings = createShopSettings(shopData);

  try {
    return await prisma.shop.create({
      data: {
        shop: shopData.myshopifyDomain,
        shopData: shopData,
        isActive: true,
        userId: userId, // Use userId directly instead of connect
        settings,
      },
      include: { subscriptions: true },
    });
  } catch (error: any) {
    console.error("Error creating shop:", {
      error: error,
      userId,
      shopDomain: shopData.myshopifyDomain,
    });
    throw error;
  }
};

const createShopSettings = (shopData: any) => ({
  general_settings: {
    language: "en",
    timezone: shopData.ianaTimezone,
  },
  user_info: {
    display_name: shopData.name,
    email: shopData.email,
    website: shopData.myshopifyDomain,
  },
});
