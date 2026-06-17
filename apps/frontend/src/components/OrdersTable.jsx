import OrderStatusBadge from './OrderStatusBadge'

function shortId(id) {
  return id ? id.slice(0, 8) + '…' : '—'
}

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function OrdersTable({ orders }) {
  if (!orders?.length) {
    return <p className="text-center text-gray-400 py-12">Nenhum pedido encontrado.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 font-medium">ID</th>
            <th className="pb-3 pr-4 font-medium">Comprador</th>
            <th className="pb-3 pr-4 font-medium">Evento</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Ingresso</th>
            <th className="pb-3 font-medium">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {orders.map(o => (
            <tr key={o.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 font-mono text-xs text-gray-400">{shortId(o.id)}</td>
              <td className="py-3 pr-4">
                <p className="font-medium text-gray-800">{o.buyer_name}</p>
                <p className="text-xs text-gray-400">{o.buyer_email}</p>
              </td>
              <td className="py-3 pr-4 text-gray-600">{o.event_id}</td>
              <td className="py-3 pr-4"><OrderStatusBadge status={o.status} /></td>
              <td className="py-3 pr-4 font-mono text-xs text-gray-400">
                {o.ticket_code ? shortId(o.ticket_code) : '—'}
              </td>
              <td className="py-3 text-gray-400 text-xs">{formatDate(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
