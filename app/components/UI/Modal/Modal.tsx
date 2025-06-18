import React from "react";
import { Modal as ShopifyModal, TitleBar } from "@shopify/app-bridge-react";
import { Box } from "@shopify/polaris";

type ModalAction = {
  content: React.ReactNode;
  onAction: () => void;
  loading?: boolean;
};

type ModalProps = {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  primaryAction?: ModalAction | null;
  secondaryActions?: ModalAction[];
  destructiveAction?: ModalAction | null;
  children?: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen = false,
  onClose,
  title = "Modal Title",
  primaryAction = null,
  secondaryActions = [],
  destructiveAction = null,
  children,
}) => {
  const handleClose = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <ShopifyModal id="modal-component" open={isOpen} onHide={handleClose}>
      <TitleBar title={title}>
        {primaryAction && (
          <button
            variant="primary"
            onClick={() => {
              primaryAction.onAction();
            }}
            loading={primaryAction.loading ? "true" : undefined}
          >
            {primaryAction.content}
          </button>
        )}
        {secondaryActions.map((action, index) => (
          <button
            key={index}
            onClick={() => {
              action.onAction();
            }}
            loading={action.loading ? "true" : undefined}
          >
            {action.content}
          </button>
        ))}
        {destructiveAction && (
          <button
            variant="primary"
            tone="critical"
            onClick={() => {
              destructiveAction.onAction();
            }}
            loading={destructiveAction.loading ? "true" : undefined}
          >
            {destructiveAction.content}
          </button>
        )}
      </TitleBar>
      <Box padding="400">{children}</Box>
    </ShopifyModal>
  );
};
