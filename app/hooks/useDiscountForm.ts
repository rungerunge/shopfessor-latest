import { useSubmit } from "@remix-run/react";
import { useCallback, useState } from "react";
import { DiscountType } from "../types/discounts";
import { DiscountMethod } from "../types/types";

interface CombinesWith {
  orderDiscounts: boolean;
  productDiscounts: boolean;
  shippingDiscounts: boolean;
}

interface FormState {
  title: string;
  method: DiscountMethod;
  type: DiscountType;
  code: string;
  value: string;
  combinesWith: CombinesWith;
  usageLimit: string;
  appliesOncePerCustomer: boolean;
  startDate: Date;
  endDate: Date | undefined;
  hasEndDate: boolean;
  minimumSubtotal: string;
  maximumShippingPrice: string;
}

interface UseDiscountFormProps {
  initialData?: Partial<FormState>;
  onSubmit?: () => void;
}

export function useDiscountForm({
  initialData,
  onSubmit,
}: UseDiscountFormProps = {}) {
  const submit = useSubmit();
  const todaysDate = new Date();

  const [formState, setFormState] = useState<FormState>(() => ({
    title: initialData?.title ?? "",
    method: initialData?.method ?? DiscountMethod.Code,
    type: initialData?.type ?? DiscountType.Percentage,
    code: initialData?.code ?? "",
    value: initialData?.value ?? "",
    combinesWith: initialData?.combinesWith ?? {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    },
    usageLimit: initialData?.usageLimit ?? "",
    appliesOncePerCustomer: initialData?.appliesOncePerCustomer ?? false,
    startDate: initialData?.startDate ?? todaysDate,
    endDate: initialData?.endDate,
    hasEndDate: initialData?.hasEndDate ?? false,
    minimumSubtotal: initialData?.minimumSubtotal ?? "",
    maximumShippingPrice: initialData?.maximumShippingPrice ?? "",
  }));

  const setField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const setCombinesWith = useCallback(
    (field: keyof CombinesWith, value: boolean) => {
      setFormState((prev) => ({
        ...prev,
        combinesWith: { ...prev.combinesWith, [field]: value },
      }));
    },
    [],
  );

  const generateCode = useCallback(() => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setField("code", `SAVE${randomCode}`);
  }, [setField]);

  const fillDummyData = useCallback(
    (type: "percentage" | "fixed" | "shipping") => {
      const dummyData = {
        percentage: {
          title: "Summer Sale - 20% Off",
          type: DiscountType.Percentage,
          method: DiscountMethod.Code,
          code: "SUMMER20",
          value: "20",
          usageLimit: "100",
          appliesOncePerCustomer: true,
        },
        fixed: {
          title: "New Customer - $10 Off",
          type: DiscountType.FixedAmount,
          method: DiscountMethod.Code,
          code: "WELCOME10",
          value: "10",
          usageLimit: "50",
          appliesOncePerCustomer: true,
        },
        shipping: {
          title: "Free Shipping Fall Promo",
          type: DiscountType.FreeShipping,
          method: DiscountMethod.Automatic,
          code: "",
          value: "0",
          usageLimit: "",
          appliesOncePerCustomer: false,
        },
      };

      const data = dummyData[type];
      setField("title", data.title);
      setField("type", data.type);
      setField("method", data.method);
      setField("code", data.code);
      setField("value", data.value);
      setField("usageLimit", data.usageLimit);
      setField("appliesOncePerCustomer", data.appliesOncePerCustomer);

      // Set dates: start today, end in 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      setField("startDate", today);
      setField("endDate", endDate);
      setField("hasEndDate", true);
    },
    [setField],
  );

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append(
      "discount",
      JSON.stringify({
        title: formState.title,
        method: formState.method,
        type: formState.type,
        code:
          formState.method === DiscountMethod.Code ? formState.code : undefined,
        value:
          formState.type !== DiscountType.FreeShipping
            ? formState.value
            : undefined,
        combinesWith: formState.combinesWith,
        usageLimit: formState.usageLimit || undefined,
        appliesOncePerCustomer: formState.appliesOncePerCustomer,
        startsAt: formState.startDate.toISOString(),
        endsAt:
          formState.hasEndDate && formState.endDate
            ? formState.endDate.toISOString()
            : undefined,
        minimumSubtotal: formState.minimumSubtotal || undefined,
        maximumShippingPrice: formState.maximumShippingPrice || undefined,
      }),
    );
    formData.append("_action", "create");
    submit(formData, { method: "post" });
    onSubmit?.();
  }, [formState, submit, onSubmit]);

  return {
    formState,
    setField,
    setCombinesWith,
    generateCode,
    fillDummyData,
    submit: handleSubmit,
  };
}
