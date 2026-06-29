import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'

export function MonthlyBar({ data }: { data: Array<{ month: string; income: number; expense: number }> }) {
  const chart = data.map((d) => ({ name: d.month.slice(5), income: d.income / 100, expense: d.expense / 100 }))
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={chart}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
