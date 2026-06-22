interface PaymentVerificationProps {
  screenshotUrl: string;
  onApprove: () => void;
  onReject: () => void;
}

export function PaymentVerification({
  screenshotUrl,
  onApprove,
  onReject,
}: PaymentVerificationProps) {
  return (
    <div className="mt-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshotUrl}
        alt="Payment proof"
        className="max-h-48 rounded-lg border"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={onApprove}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          Approve payment
        </button>
        <button
          onClick={onReject}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
