import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E', '#6366F1', '#EC4899', '#14B8A6']

export function CategoryPie({ data }: { data: Array<{ name: string; value: number }> }) {
  if (data.length === 0) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex items-center gap-3">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted">{d.name}</span>
            <span className="font-semibold tabular-nums text-ink">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
