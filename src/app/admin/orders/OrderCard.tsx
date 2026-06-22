"use client";

import { memo, useState } from "react";
import { OrderCardHeader } from "./OrderCardHeader";
import { OrderDatesTable } from "./OrderDatesTable";
import { OrderAddressTable } from "./OrderAddressTable";
import { PendingReviewForm } from "./PendingReviewForm";
import { PaymentVerification } from "./PaymentVerification";
import { OrderActions } from "./OrderActions";
import { updateOrderAction, acceptOrderAction } from "./actions";
import type { SerializedOrder, CapacityResult } from "./actions";

interface OrderCardProps {
  order: SerializedOrder;
  tab: string;
  onUpdate: (id: string, removed?: boolean) => void;
}

export const OrderCard = memo(
  function OrderCard({ order, tab, onUpdate }: OrderCardProps) {
    const [capacityPreview, setCapacityPreview] =
      useState<CapacityResult | null>(null);

    async function updateOrder(body: Record<string, unknown>) {
      try {
        await updateOrderAction(order.id, body);
        onUpdate(order.id);
      } catch (error: unknown) {
        console.error(
          error instanceof Error ? error.message : "Failed to update order",
        );
      }
    }

    async function handleAccept(params: {
      shippingDurationDays: number;
      customizationCharge: number;
      deliveryCharge: number;
      urgentOrderCharge: number;
    }) {
      try {
        await acceptOrderAction(order.id, params);
        onUpdate(order.id, true);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to accept order";
        alert(message);
      }
    }

    return (
      <li className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <OrderCardHeader order={order} />

        <div className="mt-5 overflow-x-auto">
          <OrderDatesTable order={order} />
          <OrderAddressTable addresses={order.user.addresses} />
        </div>

        {order.status === "PENDING_REVIEW" && (
          <PendingReviewForm
            orderId={order.id}
            occasionDate={order.occasionDate}
            capacityPreview={capacityPreview}
            onCapacityChange={setCapacityPreview}
            onAccept={handleAccept}
          />
        )}

        {order.payments[0]?.screenshotUrl && tab === "PAYMENT_VERIFICATION" && (
          <PaymentVerification
            screenshotUrl={order.payments[0].screenshotUrl}
            onApprove={() => updateOrder({ verifyPayment: true })}
            onReject={() => updateOrder({ rejectPayment: true })}
          />
        )}

        <OrderActions
          orderId={order.id}
          status={order.status}
          onUpdate={updateOrder}
        />
      </li>
    );
  },
  // Custom comparison function — only re-render when these change
  (prevProps, nextProps) => {
    return (
      prevProps.order.id === nextProps.order.id &&
      prevProps.order.status === nextProps.order.status &&
      prevProps.tab === nextProps.tab
    );
  },
);
