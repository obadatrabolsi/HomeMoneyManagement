import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#0ea5e9', '#6366f1', '#ec4899']

export function CategoryPie({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return null
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
