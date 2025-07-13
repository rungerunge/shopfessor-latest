import { Modal, FormLayout, TextField } from "@shopify/polaris";
import { DataSource } from "app/types/data-sources";

interface EditModalProps {
  open: boolean;
  editingSource: DataSource | null;
  onClose: () => void;
  onSave: () => void;
  onSourceChange: (source: DataSource) => void;
}

export function EditModal({
  open,
  editingSource,
  onClose,
  onSave,
  onSourceChange,
}: EditModalProps) {
  if (!editingSource) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Data Source"
      primaryAction={{
        content: "Save Changes",
        onAction: onSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <FormLayout>
          <TextField
            label="Source Name"
            value={editingSource.name}
            onChange={(value) =>
              onSourceChange({ ...editingSource, name: value })
            }
            autoComplete="off"
          />
          <TextField
            label="Content Preview"
            value={editingSource.content}
            onChange={(value) =>
              onSourceChange({ ...editingSource, content: value })
            }
            multiline={3}
            helpText="This is a preview of the content. Full content is stored separately."
            autoComplete="off"
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}
