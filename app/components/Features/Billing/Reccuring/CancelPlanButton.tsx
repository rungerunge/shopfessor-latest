import { Button } from "@shopify/polaris";
import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Modal } from "app/components/UI/Modal/Modal";

interface CancelSubscriptionButtonProps {
  subscriptionId: string;
  shopName?: string;
}

interface ActionData {
  success?: boolean;
  error?: string;
  subscription?: {
    id: string;
    status: string;
  };
}

export const CancelSubscriptionButton = ({
  subscriptionId,
  shopName,
}: CancelSubscriptionButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const shopify = useAppBridge();
  const fetcher = useFetcher<ActionData>();

  const isLoading = fetcher.state === "submitting";

  // Handle the response when fetcher completes
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      if (fetcher.data.success) {
        setIsModalOpen(false);
        shopify.toast.show("Subscription cancelled successfully");

        // Redirect to Shopify admin after a short delay
        setTimeout(() => {
          const adminShopName =
            shopName || shopify.config.shop?.split(".")[0] || "";
          const redirectUrl = adminShopName
            ? `https://admin.shopify.com/store/${adminShopName}/apps/shopifast`
            : `https://admin.shopify.com`;

          window.top!.location.href = redirectUrl;
        }, 1500);
      } else if (fetcher.data.error) {
        setIsModalOpen(false);
        shopify.toast.show(
          fetcher.data.error || "Failed to cancel subscription",
        );
      }
    }
  }, [fetcher.data, fetcher.state, shopName]);

  function handleCancelSubscription() {
    fetcher.submit(
      {
        intent: "cancel-subscription",
        subscriptionId,
      },
      {
        method: "POST",
      },
    );
  }

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant="primary"
        tone="critical"
        onClick={handleOpenModal}
        loading={isLoading}
      >
        Cancel Subscription
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Cancel Subscription"
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleCloseModal,
          },
        ]}
        destructiveAction={{
          content: "Cancel Subscription",
          onAction: handleCancelSubscription,
          loading: isLoading,
        }}
      >
        <p>
          Are you sure you want to cancel your subscription? You will lose
          access to all premium features immediately.
        </p>
      </Modal>
    </>
  );
};
