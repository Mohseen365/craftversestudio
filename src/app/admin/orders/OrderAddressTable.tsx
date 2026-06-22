interface OrderAddressTableProps {
  addresses: Array<{
    address: string;
    city: string;
    state: string;
    pincode: string;
  }>;
}

export function OrderAddressTable({ addresses }: OrderAddressTableProps) {
  return (
    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
      <thead className="border-b border-stone-100 text-stone-500">
        <tr>
          <th className="py-2 pr-4 font-medium">Address</th>
          <th className="py-2 pr-4 font-medium">City</th>
          <th className="py-2 pr-4 font-medium">State</th>
          <th className="py-2 pr-4 font-medium">Pincode</th>
        </tr>
      </thead>
      <tbody>
        {addresses.map((addr, index) => (
          <tr key={index} className="border-b border-stone-50">
            <td className="py-3 pr-4 font-mono text-xs">{addr.address}</td>
            <td className="py-3 pr-4">{addr.city}</td>
            <td className="py-3 pr-4">{addr.state}</td>
            <td className="py-3 pr-4">{addr.pincode}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
