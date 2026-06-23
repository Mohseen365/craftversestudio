"use client";

import { useState, useEffect } from "react";
import { addDays, formatDate } from "@/lib/utils";
import { checkCapacityAction } from "./actions";
import { useDebounce } from "@/hooks/useDebounce";
import type { CapacityResult, AcceptOrderParams } from "./actions";

interface PendingReviewFormProps {
  orderId: string;
  occasionDate: string | null;
  capacityPreview: CapacityResult | null;
  onCapacityChange: (preview: CapacityResult | null) => void;
  onAccept: (params: AcceptOrderParams) => void;
}

export function PendingReviewForm({
  orderId,
  occasionDate,
  capacityPreview,
  onCapacityChange,
  onAccept,
}: PendingReviewFormProps) {
  const [shippingDuration, setShippingDuration] = useState<number | "">("");
  const [customizationCharge, setCustomizationCharge] = useState<number | "">(
    0,
  );
  const [deliveryCharge, setDeliveryCharge] = useState<number | "">(0);
  const [urgentOrderCharge, setUrgentOrderCharge] = useState<number | "">(0);

  const debouncedDuration = useDebounce(shippingDuration, 400);

  // Fetch capacity preview when debounced duration changes
  useEffect(() => {
    let cancelled = false;

    if (typeof debouncedDuration === "number" && occasionDate) {
      const occasion = new Date(occasionDate);
      const shippingDate = addDays(occasion, -debouncedDuration);
      const productionDeadline = addDays(shippingDate, -1);

      checkCapacityAction(orderId, productionDeadline.toISOString())
        .then((capacity) => {
          if (!cancelled) onCapacityChange(capacity);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            console.error(
              error instanceof Error
                ? error.message
                : "Failed to check capacity",
            );
            onCapacityChange(null);
          }
        });
    } else {
      onCapacityChange(null);
    }

    return () => {
      cancelled = true;
    };
  }, [debouncedDuration, orderId, occasionDate, onCapacityChange]);

  // Calculate planning dates
  const planningDates = (() => {
    if (!occasionDate || typeof shippingDuration !== "number") {
      return { shippingDate: null, productionDeadline: null };
    }
    const occasion = new Date(occasionDate);
    const shippingDate = addDays(occasion, -shippingDuration);
    return {
      shippingDate,
      productionDeadline: addDays(shippingDate, -1),
    };
  })();

  const handleAccept = () => {
    if (typeof shippingDuration !== "number") {
      alert("Enter shipping duration before accepting this order");
      return;
    }

    onAccept({
      shippingDurationDays: shippingDuration,
      customizationCharge:
        typeof customizationCharge === "number" ? customizationCharge : 0,
      deliveryCharge: typeof deliveryCharge === "number" ? deliveryCharge : 0,
      urgentOrderCharge:
        typeof urgentOrderCharge === "number" ? urgentOrderCharge : 0,
    });
  };

  return (
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Shipping Duration */}
        <label className="text-sm">
          <span className="block font-medium text-stone-700">
            Shipping duration
          </span>
          <input
            type="number"
            min={0}
            value={shippingDuration}
            onChange={(e) =>
              setShippingDuration(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        {/* Customization Charge */}
        <label className="text-sm">
          <span className="block font-medium text-stone-700">
            Customization Charge
          </span>
          <input
            type="number"
            min={0}
            value={customizationCharge}
            onChange={(e) =>
              setCustomizationCharge(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        {/* Delivery Charge */}
        <label className="text-sm">
          <span className="block font-medium text-stone-700">
            Delivery Charge
          </span>
          <input
            type="number"
            min={0}
            value={deliveryCharge}
            onChange={(e) =>
              setDeliveryCharge(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        {/* Urgent Order Charge */}
        <label className="text-sm">
          <span className="block font-medium text-stone-700">
            Urgent Order Charge
          </span>
          <input
            type="number"
            min={0}
            value={urgentOrderCharge}
            onChange={(e) =>
              setUrgentOrderCharge(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
        </label>

        {/* Shipping Date */}
        <div className="text-sm">
          <span className="block font-medium text-stone-700">
            Shipping date
          </span>
          <span className="mt-2 block text-stone-600">
            {occasionDate
              ? planningDates.shippingDate
                ? formatDate(planningDates.shippingDate).toString()
                : "Enter duration"
              : "No occasion date"}
          </span>
        </div>

        {/* Production Deadline */}
        <div className="text-sm">
          <span className="block font-medium text-stone-700">
            Production deadline
          </span>
          <span className="mt-2 block text-stone-600">
            {occasionDate
              ? planningDates.productionDeadline
                ? formatDate(planningDates.productionDeadline).toString()
                : "Enter duration"
              : "No occasion date"}
          </span>
        </div>

        {/* Capacity */}
        <div className="text-sm">
          <span className="block font-medium text-stone-700">Capacity</span>
          {capacityPreview ? (
            <div>
              <span
                className={`mt-2 block font-medium ${
                  capacityPreview.canAccept
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {capacityPreview.canAccept ? "Available" : "No Capacity"}
              </span>
              <span className="mt-1 block text-xs text-stone-500">
                Required capacity:{" "}
                {Number(capacityPreview.requiredCapacity.toFixed(2))}
              </span>
            </div>
          ) : (
            <span className="mt-2 block text-stone-600">Enter duration</span>
          )}
        </div>
      </div>

      {/* Capacity Details */}
      {capacityPreview && (
        <div className="mt-3 text-sm">
          {capacityPreview.canAccept ? (
            <div className="text-emerald-700">
              <span className="font-semibold">Suggested schedule:</span>
              <ul className="list-disc list-inside mt-1 text-xs">
                {capacityPreview.suggestedDates.map((d, i) => (
                  <li key={i}>
                    {d.date ? formatDate(d.date) : "Not set"}:{" "}
                    {Number(d.hours.toFixed(2))} day(s)
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="font-medium text-red-700">
              {capacityPreview.reason ??
                "Accepting this order exceeds available production capacity."}
            </p>
          )}
        </div>
      )}

      {/* Accept Button */}
      <button
        onClick={handleAccept}
        disabled={
          typeof shippingDuration !== "number" ||
          capacityPreview?.canAccept === false
        }
        className="mt-4 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        Accept Order
      </button>
    </div>
  );
}
