import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'

export function MonthlyBar({ data }: { data: Array<{ month: string; income: number; expense: number }> }) {
  const chart = data.map((d) => ({ name: d.month.slice(5), income: d.income / 100, expense: d.expense / 100 }))
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={chart}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <Bar dataKey="income" fill="#10b981" />
          <Bar dataKey="expense" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
