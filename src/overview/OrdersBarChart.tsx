import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartData, ChartOptions } from 'chart.js'

/**
 * The dashboard's only chart, isolated so Chart.js (~180 kB, the single
 * heaviest dependency in the app) leaves the dashboard chunk and loads on its
 * own. `/dashboard` is where every admin lands after signing in, so the KPI
 * cards and the live-deliveries table now paint without waiting for a charting
 * library that decorates one panel.
 *
 * Registration lives here too: it must run before the first `<Bar>` renders,
 * and this module is the only thing that renders one.
 */
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props {
  data: ChartData<'bar'>
  options: ChartOptions<'bar'>
  label: string
}

export default function OrdersBarChart({ data, options, label }: Props) {
  return <Bar data={data} options={options} role="img" aria-label={label} />
}
