import MetricCard from '../MetricCard'
import { Users, FileText, CheckCircle, FolderOpen } from 'lucide-react'

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard title="Total Users" value="24" icon={Users} trend="+3 this month" />
      <MetricCard title="Today's Reports" value="18" icon={FileText} trend="75% submitted" />
      <MetricCard title="Pending Tasks" value="12" icon={CheckCircle} trend="3 due today" />
      <MetricCard title="Uploaded Files" value="156" icon={FolderOpen} trend="+8 today" />
    </div>
  )
}
