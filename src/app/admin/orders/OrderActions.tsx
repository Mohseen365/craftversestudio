import { useState } from "react";

const NEXT_STATUS: Record<string, string> = {
  CONFIRMED: "IN_PRODUCTION",
  IN_PRODUCTION: "READY_TO_SHIP",
  READY_TO_SHIP: "SHIPPED",
  SHIPPED: "DELIVERED",
};

interface OrderActionsProps {
  orderId: string;
  status: string;
  onUpdate: (body: Record<string, unknown>) => void;
}

export function OrderActions({ orderId, status, onUpdate }: OrderActionsProps) {
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleTrackingSubmit = () => {
    if (!trackingNumber.trim()) return;
    onUpdate({
      status: "SHIPPED",
      trackingNumber: trackingNumber.trim(),
    });
    setTrackingNumber("");
  };

  return (
    <>
      {/* Move to next status */}
      {NEXT_STATUS[status] && (
        <button
          onClick={() => onUpdate({ status: NEXT_STATUS[status] })}
          className="mt-4 rounded-lg bg-stone-900 px-4 py-2 text-sm text-white"
        >
          Move to {NEXT_STATUS[status].replace(/_/g, " ")}
        </button>
      )}

      {/* Ready to ship - tracking number input */}
      {status === "READY_TO_SHIP" && (
        <div className="mt-4 flex gap-2">
          <input
            placeholder="Tracking number"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTrackingSubmit();
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={handleTrackingSubmit}
            disabled={!trackingNumber.trim()}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Mark Shipped
          </button>
        </div>
      )}

      {/* Cancel order */}
      {status !== "CANCELLED" && status !== "DELIVERED" && (
        <button
          onClick={() => onUpdate({ status: "CANCELLED" })}
          className="mt-2 text-sm text-red-500 hover:underline"
        >
          Cancel order
        </button>
      )}
    </>
  );
}
