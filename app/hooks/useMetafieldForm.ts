import { useSubmit } from "@remix-run/react";
import { useCallback, useState } from "react";

interface FormState {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

interface UseMetafieldFormProps {
  initialData?: Partial<FormState>;
}

export function useMetafieldForm({
  initialData,
}: UseMetafieldFormProps = {}) {
  const submit = useSubmit();

  const [formState, setFormState] = useState<FormState>(() => ({
    namespace: initialData?.namespace ?? "",
    key: initialData?.key ?? "",
    value: initialData?.value ?? "",
    type: initialData?.type ?? "single_line_text_field",
  }));

  const setField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const fillDummyData = useCallback(
    (type: "text" | "number" | "json") => {
      const dummyData = {
        text: {
          namespace: "custom",
          key: "product_description",
          value: "This is a sample product description",
          type: "single_line_text_field",
        },
        number: {
          namespace: "custom",
          key: "product_rating",
          value: "4.5",
          type: "number_decimal",
        },
        json: {
          namespace: "custom",
          key: "product_specifications",
          value: JSON.stringify({
            dimensions: "10x20x30",
            weight: "2.5kg",
            material: "cotton",
          }),
          type: "json",
        },
      };

      const data = dummyData[type];
      setField("namespace", data.namespace);
      setField("key", data.key);
      setField("value", data.value);
      setField("type", data.type);
    },
    [setField],
  );

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append(
      "metafield",
      JSON.stringify({
        namespace: formState.namespace,
        key: formState.key,
        value: formState.value,
        type: formState.type,
      }),
    );
    formData.append("_action", "create");
    submit(formData, { method: "post" });
  }, [formState, submit]);

  return {
    formState,
    setField,
    fillDummyData,
    submit: handleSubmit,
  };
}
